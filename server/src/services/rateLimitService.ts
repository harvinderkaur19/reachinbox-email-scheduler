import { getRedisClient } from '../utils/redis';
import { config } from '../config';

export interface RateLimitCheckResult {
  allowed: boolean;
  reason?: 'HOURLY_LIMIT_REACHED' | 'REDIS_ERROR';
  delayMs?: number;
  sendTimestamp?: number;
  currentCount?: number;
  nextAvailableTimestamp?: number;
}

const LUA_RATE_LIMIT_SCRIPT = `
local rateLimitKey = KEYS[1]
local sendGateKey = KEYS[2]

local now = tonumber(ARGV[1])
local minSendDelayMs = tonumber(ARGV[2])
local maxEmailsPerHour = tonumber(ARGV[3])
local ttlSeconds = tonumber(ARGV[4])
local currentHourEndMs = tonumber(ARGV[5])

local currentCount = tonumber(redis.call('GET', rateLimitKey) or "0")

if currentCount >= maxEmailsPerHour then
    return {0, currentCount, 0, 0}
end

local lastGateTime = tonumber(redis.call('GET', sendGateKey) or "0")
local nextPermittedTime = math.max(now, lastGateTime)

if nextPermittedTime >= currentHourEndMs then
    return {0, currentCount, 0, 0}
end

local nextGateTime = nextPermittedTime + minSendDelayMs

local newCount = redis.call('INCR', rateLimitKey)
if newCount == 1 then
    redis.call('EXPIRE', rateLimitKey, ttlSeconds)
end

redis.call('SET', sendGateKey, tostring(nextGateTime), 'EX', ttlSeconds)

local delayMs = math.max(0, nextPermittedTime - now)

return {1, newCount, delayMs, nextPermittedTime}
`;

/**
 * Calculates current UTC hour window string and timestamps.
 */
export const getUtcHourWindow = (nowMs: number = Date.now()) => {
  const date = new Date(nowMs);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hour = String(date.getUTCHours()).padStart(2, '0');

  const hourWindowStr = `${year}-${month}-${day}-${hour}`;
  const currentHourStartMs = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    0,
    0,
    0
  );
  const currentHourEndMs = currentHourStartMs + 3600 * 1000;
  const nextHourStartMs = currentHourEndMs;

  return {
    hourWindowStr,
    currentHourStartMs,
    currentHourEndMs,
    nextHourStartMs,
  };
};

/**
 * Atomically checks hourly rate limits and reserves send slot per sender in Redis.
 *
 * @param senderAccountId - ID of the sender account.
 * @returns RateLimitCheckResult object.
 */
export const checkAndReserveSendSlot = async (
  senderAccountId: string
): Promise<RateLimitCheckResult> => {
  const now = Date.now();
  const { hourWindowStr, currentHourEndMs, nextHourStartMs } = getUtcHourWindow(now);

  const rateLimitKey = `rate-limit:${senderAccountId}:${hourWindowStr}`;
  const sendGateKey = `send-gate:${senderAccountId}`;

  const minSendDelayMs = config.MIN_SEND_DELAY_MS;
  const maxEmailsPerHour = config.MAX_EMAILS_PER_HOUR_PER_SENDER;
  const ttlSeconds = 7200; // 2 hours TTL

  try {
    const redis = getRedisClient();
    const result = (await redis.eval(
      LUA_RATE_LIMIT_SCRIPT,
      2,
      rateLimitKey,
      sendGateKey,
      now.toString(),
      minSendDelayMs.toString(),
      maxEmailsPerHour.toString(),
      ttlSeconds.toString(),
      currentHourEndMs.toString()
    )) as [number, number, number, number];

    const [allowedFlag, currentCount, delayMs, sendTimestamp] = result;

    if (allowedFlag === 1) {
      return {
        allowed: true,
        delayMs,
        sendTimestamp,
        currentCount,
      };
    } else {
      return {
        allowed: false,
        reason: 'HOURLY_LIMIT_REACHED',
        currentCount,
        nextAvailableTimestamp: nextHourStartMs,
      };
    }
  } catch (error) {
    console.error(
      `[RateLimitService] Error communicating with Redis for sender ${senderAccountId}:`,
      error
    );
    throw new Error(`Rate limit check failed due to Redis unavailability: ${error instanceof Error ? error.message : String(error)}`);
  }
};

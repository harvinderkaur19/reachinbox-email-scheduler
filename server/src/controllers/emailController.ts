import { Request, Response } from 'express';
import { scheduleCampaignService, updateScheduledEmailService, ServiceError as SchedulingServiceError } from '../services/emailSchedulingService';
import { searchEmails as searchEmailsService, ServiceError as ElasticServiceError } from '../services/elasticsearchService';
import {
  parsePaginationParams,
  getScheduledEmailsService,
  getSentEmailsService,
  ServiceError as ReadServiceError,
} from '../services/emailReadService';
import { ApiResponse, ScheduleCampaignResponse } from '../types';

export const scheduleEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized: User context missing',
      });
      return;
    }

    const result: ScheduleCampaignResponse = await scheduleCampaignService(req.user.id, req.body);

    const hasQueueFailures = result.queueFailures && result.queueFailures.length > 0;

    if (hasQueueFailures) {
      const response: ApiResponse<ScheduleCampaignResponse> = {
        success: false,
        message:
          'Campaign records persisted in database, but failed to enqueue one or more BullMQ background jobs',
        data: result,
      };
      res.status(207).json(response);
      return;
    }

    const response: ApiResponse<ScheduleCampaignResponse> = {
      success: true,
      message: 'Campaign scheduled and queued successfully',
      data: result,
    };
    res.status(201).json(response);
  } catch (error) {
    if (error instanceof ElasticServiceError || error instanceof ReadServiceError || error instanceof SchedulingServiceError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
      return;
    }

    console.error('[EmailController] Unexpected error in scheduleEmail:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while scheduling email campaign',
    });
  }
};

export const updateScheduledEmail = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized: User context missing',
      });
      return;
    }

    const emailId = req.params.id;
    const result = await updateScheduledEmailService(req.user.id, emailId, req.body);

    res.status(200).json({
      success: true,
      message: 'Scheduled email updated successfully',
      data: result,
    });
  } catch (error) {
    if (error instanceof SchedulingServiceError || error instanceof ReadServiceError || error instanceof ElasticServiceError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
      return;
    }

    console.error('[EmailController] Unexpected error in updateScheduledEmail:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while updating scheduled email',
    });
  }
};

export const searchEmails = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized: User context missing',
      });
      return;
    }

    const query = typeof req.query.q === 'string' ? req.query.q : undefined;
    const result = await searchEmailsService(req.user.id, query);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof ElasticServiceError || error instanceof ReadServiceError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
      return;
    }

    console.error('[EmailController] Unexpected error in searchEmails:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while searching emails',
    });
  }
};

export const getScheduledEmails = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized: User context missing',
      });
      return;
    }

    const { page, limit } = parsePaginationParams(req.query.page, req.query.limit);
    const result = await getScheduledEmailsService(req.user.id, page, limit);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof ReadServiceError || error instanceof ElasticServiceError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
      return;
    }

    console.error('[EmailController] Unexpected error in getScheduledEmails:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching scheduled emails',
    });
  }
};

export const getSentEmails = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized: User context missing',
      });
      return;
    }

    const { page, limit } = parsePaginationParams(req.query.page, req.query.limit);
    const result = await getSentEmailsService(req.user.id, page, limit);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof ReadServiceError || error instanceof ElasticServiceError) {
      res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
      return;
    }

    console.error('[EmailController] Unexpected error in getSentEmails:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error while fetching sent emails',
    });
  }
};


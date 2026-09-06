import { Request, Response } from 'express';
import { scheduleCampaignService } from '../services/emailSchedulingService';
import { searchEmails as searchEmailsService, ServiceError } from '../services/elasticsearchService';
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
    if (error instanceof ServiceError) {
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
    if (error instanceof ServiceError) {
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

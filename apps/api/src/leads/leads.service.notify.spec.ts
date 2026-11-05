import { Logger } from '@nestjs/common';
import type { Sequelize } from 'sequelize-typescript';
import { buildLead } from '@test/helpers/build-models';
import type { NotificationsService } from '../notifications/notifications.service';
import type { SummariesService } from '../summaries/summaries.service';
import type { CreateLeadDto } from './dto/create-lead.dto';
import { LeadsService } from './leads.service';
import type { Lead } from './lead.model';

/** The lead-created hook in isolation: what it asks the notifier for, and that a failure never escapes. */
describe('LeadsService.create notification hook', () => {
  const created = buildLead({
    id: '55555555-5555-4555-8555-555555555555',
    firstName: 'Grace',
    lastName: 'Hopper',
  });
  let leadModel: { create: jest.Mock };
  let notifications: { notifyAllUsers: jest.Mock };
  let service: LeadsService;

  beforeEach(() => {
    leadModel = { create: jest.fn().mockResolvedValue(created) };
    notifications = { notifyAllUsers: jest.fn().mockResolvedValue([]) };
    service = new LeadsService(
      leadModel as unknown as typeof Lead,
      {} as SummariesService,
      {} as Sequelize,
      notifications as unknown as NotificationsService,
    );
  });

  it('broadcasts lead_created naming the lead, after the lead is stored', async () => {
    await service.create({} as CreateLeadDto);

    expect(notifications.notifyAllUsers).toHaveBeenCalledWith({
      type: 'lead_created',
      title: 'New lead',
      message: 'Grace Hopper was added',
      leadId: created.id,
    });
    expect(leadModel.create.mock.invocationCallOrder[0]).toBeLessThan(
      notifications.notifyAllUsers.mock.invocationCallOrder[0],
    );
  });

  it('logs and swallows a notifier failure, still returning the lead', async () => {
    notifications.notifyAllUsers.mockRejectedValue(new Error('boom'));
    const logged = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);

    await expect(service.create({} as CreateLeadDto)).resolves.toMatchObject({
      id: created.id,
    });
    expect(logged).toHaveBeenCalledWith(
      expect.stringContaining(created.id),
      expect.any(String),
    );
    logged.mockRestore();
  });

  it('does not notify when storing the lead fails', async () => {
    leadModel.create.mockRejectedValue(new Error('insert failed'));

    await expect(service.create({} as CreateLeadDto)).rejects.toThrow(
      'insert failed',
    );
    expect(notifications.notifyAllUsers).not.toHaveBeenCalled();
  });
});

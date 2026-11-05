import { NotFoundException } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { modelRegistry } from '@test/helpers/build-models';
import { Notification } from './notification.model';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';

const X = '11111111-1111-4111-8111-111111111111';
const Y = '22222222-2222-4222-8222-222222222222';
const LEAD = '33333333-3333-4333-8333-333333333333';

function row(
  userId: string,
  overrides: Partial<Notification> = {},
): Notification {
  void modelRegistry;
  return Notification.build({
    id: '44444444-4444-4444-8444-444444444444',
    userId,
    type: 'lead_created',
    title: 'New lead',
    message: 'Ada Lovelace was added',
    isRead: false,
    leadId: LEAD,
    createdAt: new Date('2026-11-05T10:00:00.000Z'),
    updatedAt: new Date('2026-11-05T10:00:00.000Z'),
    ...overrides,
  });
}

describe('NotificationsService', () => {
  let model: {
    bulkCreate: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    count: jest.Mock;
    update: jest.Mock;
  };
  let sequelize: { query: jest.Mock };
  let gateway: { emitNotification: jest.Mock; emitUnreadCount: jest.Mock };
  let service: NotificationsService;

  beforeEach(() => {
    model = {
      bulkCreate: jest.fn(),
      findAll: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      count: jest.fn().mockResolvedValue(1),
      update: jest.fn().mockResolvedValue([0]),
    };
    sequelize = { query: jest.fn() };
    gateway = { emitNotification: jest.fn(), emitUnreadCount: jest.fn() };
    service = new NotificationsService(
      model as unknown as typeof Notification,
      sequelize as unknown as Sequelize,
      gateway as unknown as NotificationsGateway,
    );
  });

  describe('notifyAllUsers', () => {
    it('inserts one row per user and emits to each recipient only', async () => {
      sequelize.query.mockResolvedValue([{ id: X }, { id: Y }]);
      model.bulkCreate.mockImplementation((rows: { userId: string }[]) =>
        Promise.resolve(rows.map((r) => row(r.userId))),
      );

      const result = await service.notifyAllUsers({
        type: 'lead_created',
        title: 'New lead',
        message: 'Ada Lovelace was added',
        leadId: LEAD,
      });

      expect(model.bulkCreate).toHaveBeenCalledWith([
        expect.objectContaining({ userId: X, leadId: LEAD }),
        expect.objectContaining({ userId: Y, leadId: LEAD }),
      ]);
      expect(result.map((n) => n.userId)).toEqual([X, Y]);
      expect(gateway.emitNotification).toHaveBeenCalledTimes(2);
      expect(gateway.emitNotification).toHaveBeenCalledWith(
        X,
        expect.objectContaining({ userId: X, type: 'lead_created' }),
      );
      expect(gateway.emitUnreadCount).toHaveBeenCalledWith(Y, { count: 1 });
    });

    it('emits only after the insert has resolved', async () => {
      sequelize.query.mockResolvedValue([{ id: X }]);
      model.bulkCreate.mockRejectedValue(new Error('insert failed'));

      await expect(
        service.notifyAllUsers({
          type: 'lead_created',
          title: 't',
          message: 'm',
        }),
      ).rejects.toThrow('insert failed');
      expect(gateway.emitNotification).not.toHaveBeenCalled();
    });

    it('does nothing when there are no users', async () => {
      sequelize.query.mockResolvedValue([]);

      await expect(
        service.notifyAllUsers({
          type: 'lead_created',
          title: 't',
          message: 'm',
        }),
      ).resolves.toEqual([]);
      expect(model.bulkCreate).not.toHaveBeenCalled();
    });

    it('stores a null leadId when none is given', async () => {
      sequelize.query.mockResolvedValue([{ id: X }]);
      model.bulkCreate.mockResolvedValue([row(X, { leadId: null })]);

      await service.notifyAllUsers({
        type: 'lead_created',
        title: 't',
        message: 'm',
      });

      expect(model.bulkCreate).toHaveBeenCalledWith([
        expect.objectContaining({ leadId: null }),
      ]);
    });
  });

  describe('scoping', () => {
    it('lists with the caller id in the WHERE and the default limit', async () => {
      await service.list(X);

      expect(model.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: X }, limit: 50 }),
      );
    });

    it('passes an explicit limit through', async () => {
      await service.list(X, 7);

      expect(model.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 7 }),
      );
    });

    it('counts only the caller unread rows', async () => {
      await expect(service.unreadCount(X)).resolves.toEqual({ count: 1 });
      expect(model.count).toHaveBeenCalledWith({
        where: { userId: X, isRead: false },
      });
    });

    it.each(['markRead', 'markUnread', 'remove'] as const)(
      '%s answers 404 for a row that is not the caller own',
      async (method) => {
        model.findOne.mockResolvedValue(null);

        await expect(service[method](Y, 'some-id')).rejects.toBeInstanceOf(
          NotFoundException,
        );
        expect(model.findOne).toHaveBeenCalledWith({
          where: { id: 'some-id', userId: Y },
        });
        expect(gateway.emitUnreadCount).not.toHaveBeenCalled();
      },
    );
  });

  describe('state changes', () => {
    it('marks read, returns the row and emits the new count to the caller', async () => {
      const owned = row(X);
      jest.spyOn(owned, 'update').mockImplementation(() => {
        owned.isRead = true;
        return Promise.resolve(owned);
      });
      model.findOne.mockResolvedValue(owned);
      model.count.mockResolvedValue(0);

      const result = await service.markRead(X, owned.id);

      expect(result.isRead).toBe(true);
      expect(gateway.emitUnreadCount).toHaveBeenCalledWith(X, { count: 0 });
    });

    it('marks unread', async () => {
      const owned = row(X, { isRead: true });
      const update = jest.spyOn(owned, 'update').mockResolvedValue(owned);
      model.findOne.mockResolvedValue(owned);

      await service.markUnread(X, owned.id);

      expect(update).toHaveBeenCalledWith({ isRead: false });
      expect(gateway.emitUnreadCount).toHaveBeenCalledWith(X, { count: 1 });
    });

    it('marks all read for the caller only and emits', async () => {
      model.count.mockResolvedValue(0);

      await expect(service.markAllRead(X)).resolves.toEqual({ count: 0 });
      expect(model.update).toHaveBeenCalledWith(
        { isRead: true },
        { where: { userId: X, isRead: false } },
      );
      expect(gateway.emitUnreadCount).toHaveBeenCalledWith(X, { count: 0 });
    });

    it('deletes an owned row and emits the new count', async () => {
      const owned = row(X);
      const destroy = jest.spyOn(owned, 'destroy').mockResolvedValue(undefined);
      model.findOne.mockResolvedValue(owned);

      await service.remove(X, owned.id);

      expect(destroy).toHaveBeenCalled();
      expect(gateway.emitUnreadCount).toHaveBeenCalledWith(X, { count: 1 });
    });
  });
});

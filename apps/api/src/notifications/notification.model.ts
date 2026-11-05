import type { NotificationType } from '@ai-academy/shared';
import type {
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
} from 'sequelize';
import {
  Column,
  CreatedAt,
  DataType,
  Default,
  Model,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';
import { NOTIFICATION_TYPES } from './notification-type';

/**
 * One row per recipient. Attributes are camelCase; the snake_case column mapping
 * comes from the global `define: { underscored: true }` (Decision 4).
 *
 * There is deliberately no User association: the User model belongs to the auth
 * branch, and `userId` is all this feature needs.
 */
@Table({ tableName: 'notifications' })
export class Notification extends Model<
  InferAttributes<Notification>,
  InferCreationAttributes<Notification>
> {
  @Default(DataType.UUIDV4)
  @Column({ type: DataType.UUID, primaryKey: true, allowNull: false })
  declare id: CreationOptional<string>;

  @Column({ type: DataType.UUID, allowNull: false })
  declare userId: string;

  @Column({
    type: DataType.STRING(30),
    allowNull: false,
    validate: { isIn: [[...NOTIFICATION_TYPES]] },
  })
  declare type: NotificationType;

  @Column({ type: DataType.STRING(200), allowNull: false })
  declare title: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  declare message: string;

  @Default(false)
  @Column({ type: DataType.BOOLEAN, allowNull: false })
  declare isRead: CreationOptional<boolean>;

  @Column({ type: DataType.UUID, allowNull: true })
  declare leadId: string | null;

  @CreatedAt
  declare createdAt: CreationOptional<Date>;

  @UpdatedAt
  declare updatedAt: CreationOptional<Date>;
}

import type { InteractionType } from '@ai-academy/shared';
import type {
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  NonAttribute,
} from 'sequelize';
import {
  BelongsTo,
  Column,
  CreatedAt,
  DataType,
  Default,
  ForeignKey,
  Model,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';
import { Lead } from '../leads/lead.model';
import { INTERACTION_TYPES } from './interaction-type';

/**
 * Attributes are camelCase; columns are snake_case. Nothing here declares that
 * mapping — it comes from the global `define: { underscored: true }` in
 * database.module.ts (Decision 4).
 *
 * See lead.model.ts for why the attribute generics are load-bearing rather than
 * decorative: without them `bulkCreate` accepts no object literal at all.
 */
@Table({ tableName: 'interactions' })
export class Interaction extends Model<
  InferAttributes<Interaction>,
  InferCreationAttributes<Interaction>
> {
  @Default(DataType.UUIDV4)
  @Column({ type: DataType.UUID, primaryKey: true, allowNull: false })
  declare id: CreationOptional<string>;

  @ForeignKey(() => Lead)
  @Column({ type: DataType.UUID, allowNull: false })
  declare leadId: string;

  @BelongsTo(() => Lead)
  declare lead?: NonAttribute<Lead>;

  /** Second line of defence behind the interactions_type_check constraint. */
  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    validate: { isIn: [[...INTERACTION_TYPES]] },
  })
  declare type: InteractionType;

  /** TIMESTAMPTZ — a genuine instant, unlike Lead.inquiryDate. */
  @Column({ type: DataType.DATE, allowNull: false })
  declare occurredAt: CreationOptional<Date>;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare notes: string | null;

  @CreatedAt
  declare createdAt: CreationOptional<Date>;

  @UpdatedAt
  declare updatedAt: CreationOptional<Date>;
}

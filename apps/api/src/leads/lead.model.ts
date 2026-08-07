import type { LeadStatus, PropertyType } from '@ai-academy/shared';
import type {
  CreationOptional,
  InferAttributes,
  InferCreationAttributes,
  NonAttribute,
} from 'sequelize';
import {
  Column,
  CreatedAt,
  DataType,
  Default,
  HasMany,
  Model,
  Table,
  UpdatedAt,
} from 'sequelize-typescript';
import { Interaction } from '../interactions/interaction.model';
import { LEAD_STATUSES, PROPERTY_TYPES } from './lead-status';

/**
 * Attributes are camelCase; columns are snake_case. Nothing here declares that
 * mapping — it comes from the global `define: { underscored: true }` in
 * database.module.ts (Decision 4).
 *
 * The `validate` blocks are a second line of defence behind the DB CHECK
 * constraints. They reuse the same arrays the DTOs use, so the model cannot
 * drift from the request validation.
 *
 * The attribute generics are not decoration. A bare `extends Model` leaves
 * `_creationAttributes` as `any`, and `bulkCreate` then demands
 * `Optional<any, string>` — a type nothing satisfies without a numeric index
 * signature. `CreationOptional` marks the five fields a caller may omit because
 * something else supplies them: a client-side UUID default, a model default, or
 * a column DEFAULT in migration 001.
 */
@Table({ tableName: 'leads' })
export class Lead extends Model<
  InferAttributes<Lead>,
  InferCreationAttributes<Lead>
> {
  @Default(DataType.UUIDV4)
  @Column({ type: DataType.UUID, primaryKey: true, allowNull: false })
  declare id: CreationOptional<string>;

  @Column({ type: DataType.STRING(100), allowNull: false })
  declare firstName: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  declare lastName: string;

  /** Indexed but deliberately NOT unique — couples share an address. */
  @Column({ type: DataType.STRING(255), allowNull: false })
  declare email: string;

  @Column({ type: DataType.STRING(30), allowNull: true })
  declare phone: string | null;

  @Default('active')
  @Column({
    type: DataType.STRING(20),
    allowNull: false,
    validate: { isIn: [[...LEAD_STATUSES]] },
  })
  declare status: CreationOptional<LeadStatus>;

  /** Whole dollars. INTEGER so the pg driver returns a number, not a string. */
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare budget: number | null;

  /** Nullable: rarely known at first contact. */
  @Column({ type: DataType.STRING(100), allowNull: true })
  declare location: string | null;

  @Column({
    type: DataType.STRING(20),
    allowNull: true,
    validate: { isIn: [[...PROPERTY_TYPES]] },
  })
  declare propertyType: PropertyType | null;

  /** NULL for `land` — not applicable, as distinct from zero. */
  @Column({ type: DataType.INTEGER, allowNull: true })
  declare bedrooms: number | null;

  @Column({ type: DataType.STRING(30), allowNull: true })
  declare source: string | null;

  /**
   * DATEONLY, so Sequelize hands back a 'YYYY-MM-DD' string rather than a Date.
   * That matches the wire contract exactly and sidesteps the midnight-UTC
   * off-by-one-day bug a TIMESTAMPTZ would introduce.
   *
   * @Default duplicates migration 001's `DEFAULT CURRENT_DATE`, and it has to.
   * Sequelize runs its own notNull validation BEFORE the INSERT and treats an
   * omitted attribute as null, so `allowNull: false` with no model default makes
   * the column default unreachable through the model: POST /api/leads without an
   * inquiryDate fails with `notNull Violation` rather than falling back. The two
   * defaults also differ usefully — CURRENT_DATE is the database's today and the
   * container runs UTC, whereas DataType.NOW is the API process's today.
   */
  @Default(DataType.NOW)
  @Column({ type: DataType.DATEONLY, allowNull: false })
  declare inquiryDate: CreationOptional<string>;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare notes: string | null;

  @CreatedAt
  declare createdAt: CreationOptional<Date>;

  @UpdatedAt
  declare updatedAt: CreationOptional<Date>;

  /**
   * Populated only by the detail query's `include`; absent on list rows.
   * NonAttribute keeps InferAttributes from treating an association as a column.
   */
  @HasMany(() => Interaction, { onDelete: 'CASCADE' })
  declare interactions?: NonAttribute<Interaction[]>;
}

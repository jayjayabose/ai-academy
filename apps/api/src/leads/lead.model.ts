import type { LeadStatus, PropertyType } from '@ai-academy/shared';
import { Column, CreatedAt, DataType, Default, HasMany, Model, Table, UpdatedAt } from 'sequelize-typescript';
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
 */
@Table({ tableName: 'leads' })
export class Lead extends Model {
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID, primaryKey: true, allowNull: false })
    declare id: string;

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
    declare status: LeadStatus;

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
     */
    @Column({ type: DataType.DATEONLY, allowNull: false })
    declare inquiryDate: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    declare notes: string | null;

    @CreatedAt
    declare createdAt: Date;

    @UpdatedAt
    declare updatedAt: Date;

    /** Populated only by the detail query's `include`; absent on list rows. */
    @HasMany(() => Interaction, { onDelete: 'CASCADE' })
    declare interactions?: Interaction[];
}

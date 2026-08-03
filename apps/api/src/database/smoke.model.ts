import { Column, CreatedAt, DataType, Model, Table, UpdatedAt } from 'sequelize-typescript';

/**
 * THROWAWAY. Exists only to prove the infrastructure chain end to end
 * (migration -> table -> model -> query) without pre-committing to the Lead /
 * Interaction data model, which has not been designed yet.
 *
 * Delete together with migrations/000-smoke.ts once migration 001 lands.
 *
 * Note the attribute names are camelCase while the columns are snake_case
 * (Decision 4). Nothing here declares that mapping — it comes from the global
 * `define: { underscored: true }` in database.module.ts.
 */
@Table({ tableName: '_smoke', timestamps: true })
export class Smoke extends Model<Smoke> {
    @Column({ type: DataType.STRING, allowNull: false })
    declare label: string;

    @CreatedAt
    declare createdAt: Date;

    @UpdatedAt
    declare updatedAt: Date;
}

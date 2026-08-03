import { DataTypes } from 'sequelize';
import type { Migration } from '../migrate';

/**
 * THROWAWAY — proves the migration chain works without pre-committing to the
 * Lead / Interaction data model. Revert and delete before writing 001.
 *
 * Trap #5: QueryInterface does NOT apply `underscored`. Column names must be
 * spelled snake_case here by hand, even though the model declares camelCase
 * attributes. Getting this wrong is silent — the model simply cannot find its
 * columns at runtime.
 */
export const up: Migration = async ({ context: queryInterface }) => {
    await queryInterface.createTable('_smoke', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },
        label: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        updated_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    });
};

export const down: Migration = async ({ context: queryInterface }) => {
    await queryInterface.dropTable('_smoke');
};

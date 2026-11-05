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

/**
 * Maps the `users` table created by migration 004. Attributes are camelCase;
 * columns are snake_case via the global `underscored` option.
 *
 * `email` is stored lowercased and trimmed — AuthService normalises before every
 * insert and lookup, because the unique index is on the stored value.
 */
@Table({ tableName: 'users' })
export class User extends Model<
  InferAttributes<User>,
  InferCreationAttributes<User>
> {
  @Default(DataType.UUIDV4)
  @Column({ type: DataType.UUID, primaryKey: true, allowNull: false })
  declare id: CreationOptional<string>;

  @Column({ type: DataType.STRING(255), allowNull: false, unique: true })
  declare email: string;

  @Column({ type: DataType.STRING(255), allowNull: false })
  declare passwordHash: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  declare firstName: string;

  @Column({ type: DataType.STRING(100), allowNull: false })
  declare lastName: string;

  @CreatedAt
  declare createdAt: CreationOptional<Date>;

  @UpdatedAt
  declare updatedAt: CreationOptional<Date>;

  /** Last line of defence: even a stray `res.json(user)` cannot leak the hash. */
  override toJSON(): Record<string, unknown> {
    const plain: Record<string, unknown> = { ...this.get({ plain: true }) };
    delete plain.passwordHash;
    return plain;
  }
}

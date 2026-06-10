import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ name: 'password_hash', type: 'text' })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  nickname!: string | null;

  // Timestamp the user agreed to the Terms of Service (서비스 이용약관). Required at signup.
  @Column({ name: 'terms_agreed_at', type: 'timestamptz' })
  termsAgreedAt!: Date;

  // Timestamp the user consented to personal information collection & use (개인정보 수집·이용). Required at signup.
  @Column({ name: 'privacy_agreed_at', type: 'timestamptz' })
  privacyAgreedAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

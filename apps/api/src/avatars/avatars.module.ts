import { mkdir } from 'node:fs/promises';
import { Module, type OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getAvatarsDir } from './avatars.config.js';

@Module({})
export class AvatarsModule implements OnModuleInit {
  constructor(private readonly config: ConfigService) {}

  /** Creates the avatar directory at startup so uploads never fail on a missing one. */
  async onModuleInit(): Promise<void> {
    await mkdir(getAvatarsDir(this.config), { recursive: true });
  }
}

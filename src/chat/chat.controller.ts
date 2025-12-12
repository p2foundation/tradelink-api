import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('message')
  async sendMessage(@Body() sendMessageDto: SendMessageDto) {
    return this.chatService.sendMessage(sendMessageDto.message, sendMessageDto.conversationHistory);
  }

  @Get('health')
  async health() {
    return { status: 'ok', service: 'chat' };
  }
}


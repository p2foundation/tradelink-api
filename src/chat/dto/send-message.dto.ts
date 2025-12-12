import { IsString, IsOptional, IsArray } from 'class-validator';

export class ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class SendMessageDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsArray()
  conversationHistory?: ConversationMessage[];
}


import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiClientService } from '../ai/ai-client.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly openaiApiKey: string | undefined;
  private readonly useAi: boolean;

  constructor(
    private aiClient: AiClientService,
    private configService: ConfigService,
  ) {
    this.openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.useAi = !!this.openaiApiKey && this.openaiApiKey.length > 0;
  }

  async sendMessage(message: string, conversationHistory: Array<{ role: string; content: string }> = []) {
    this.logger.log(`Chat message received: ${message.substring(0, 50)}...`);

    try {
      // Build the prompt with context about TradeLink+
      const systemPrompt = `You are a helpful assistant for TradeLink+, an AI-driven MSME export platform connecting Ghanaian farmers and export companies with international buyers.

Key Information about TradeLink+:
- Platform connects farmers, buyers, and export companies
- Features: AI-powered matching, real-time market insights, secure transactions, price predictions
- Supports commodities: Cocoa, Coffee, Cashew, Shea Nuts, Palm Oil, Rice, Maize, and more
- Serves Ghana and connects to international markets (China, Kenya, Rwanda, USA, etc.)
- Provides market intelligence, price forecasting, and automated matching
- Secure payment processing and transaction tracking
- Supports multiple user roles: Farmers, Buyers, Export Companies, Admins

Your role:
- Help users understand the platform
- Answer questions about features, registration, how to use the platform
- Provide information about supported commodities and markets
- Guide users through the registration process
- Be friendly, professional, and concise
- If you don't know something, admit it and suggest they contact support

Keep responses conversational and helpful.`;

      // Use the AI client to generate a response
      const response = await this.generateChatResponse(message, conversationHistory, systemPrompt);

      this.logger.log('Chat response generated successfully');

      return {
        response,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(`Chat error: ${error.message}`, error.stack);
      
      // Fallback response if AI fails
      return {
        response: this.getFallbackResponse(message),
        timestamp: new Date().toISOString(),
      };
    }
  }

  private async generateChatResponse(
    message: string,
    conversationHistory: Array<{ role: string; content: string }>,
    systemPrompt: string,
  ): Promise<string> {
    if (!this.useAi || !this.openaiApiKey) {
      return this.getFallbackResponse(message);
    }

    try {
      // Build messages array for OpenAI
      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.slice(-10), // Keep last 10 messages for context
        { role: 'user', content: message },
      ];

      // Call OpenAI API
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: messages,
          temperature: 0.7,
          max_tokens: 300,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || this.getFallbackResponse(message);
    } catch (error) {
      this.logger.error(`OpenAI chat error: ${error.message}`);
      return this.getFallbackResponse(message);
    }
  }

  private getFallbackResponse(message: string): string {
    const lowerMessage = message.toLowerCase();

    // Keyword-based fallback responses
    if (lowerMessage.includes('register') || lowerMessage.includes('sign up') || lowerMessage.includes('account')) {
      return 'To register on TradeLink+, click the "Get Started Free" button on the homepage. You can register as a Farmer, Buyer, or Export Company. The registration process is simple and takes just a few minutes!';
    }

    if (lowerMessage.includes('login') || lowerMessage.includes('sign in')) {
      return 'You can sign in using the "Sign In" button on the homepage. If you don\'t have an account yet, you can register for free!';
    }

    if (lowerMessage.includes('farmer') || lowerMessage.includes('farming')) {
      return 'Farmers can list their agricultural products (cocoa, coffee, cashew, shea nuts, etc.) on TradeLink+. The platform uses AI to match you with the best buyers, provides real-time market prices, and helps you get the best deals for your produce.';
    }

    if (lowerMessage.includes('buyer') || lowerMessage.includes('purchase') || lowerMessage.includes('buy')) {
      return 'Buyers can browse verified listings from Ghanaian farmers, get AI-powered recommendations, and make secure transactions. You can filter by crop type, quality grade, and location to find exactly what you need.';
    }

    if (lowerMessage.includes('export') || lowerMessage.includes('export company')) {
      return 'Export companies can use TradeLink+ to source quality agricultural products from verified farmers, manage export transactions, and access market intelligence to make informed decisions.';
    }

    if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('pricing')) {
      return 'TradeLink+ provides real-time market prices and AI-powered price predictions to help you make informed trading decisions. Prices are displayed in your preferred currency.';
    }

    if (lowerMessage.includes('commodity') || lowerMessage.includes('crop') || lowerMessage.includes('product')) {
      return 'TradeLink+ supports various agricultural commodities including Cocoa, Coffee, Cashew, Shea Nuts, Palm Oil, Rice, Maize, Yam, Plantain, Mango, Pineapple, and more.';
    }

    if (lowerMessage.includes('secure') || lowerMessage.includes('safety') || lowerMessage.includes('payment')) {
      return 'TradeLink+ ensures secure transactions with end-to-end encryption, verified partners, and secure payment processing. All transactions are tracked and monitored for your safety.';
    }

    if (lowerMessage.includes('ai') || lowerMessage.includes('artificial intelligence') || lowerMessage.includes('matching')) {
      return 'TradeLink+ uses advanced AI to match buyers with sellers based on product requirements, quality standards, and preferences. The AI also provides market insights and price predictions to help you make better trading decisions.';
    }

    if (lowerMessage.includes('help') || lowerMessage.includes('support') || lowerMessage.includes('contact')) {
      return 'For support, you can contact us at info@tradelink.gh or call +233 123 456 789. You can also check our documentation or reach out through the platform.';
    }

    // Default response
    return 'Thank you for your interest in TradeLink+! I\'m here to help you learn about our platform. You can ask me about registration, features, commodities, pricing, or how to use the platform. What would you like to know?';
  }
}


import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * AI Client Service
 * Handles integration with AI providers (OpenAI, Anthropic, etc.)
 * Falls back to rule-based logic if no API key is provided
 */
@Injectable()
export class AiClientService {
  private readonly logger = new Logger(AiClientService.name);
  private readonly openaiApiKey: string | undefined;
  private readonly useAi: boolean;

  constructor(private configService: ConfigService) {
    this.openaiApiKey = this.configService.get<string>('OPENAI_API_KEY');
    this.useAi = !!this.openaiApiKey && this.openaiApiKey.length > 0;
    
    if (this.useAi) {
      this.logger.log('AI services enabled with OpenAI');
    } else {
      this.logger.warn('No OpenAI API key found. Using rule-based fallback.');
    }
  }

  /**
   * Generate intelligent match recommendations using LLM
   */
  async generateMatchRecommendation(
    buyerProfile: any,
    listing: any,
    compatibilityScore: number,
  ): Promise<string[]> {
    if (!this.useAi) {
      return this.getFallbackReasons(buyerProfile, listing, compatibilityScore);
    }

    try {
      const prompt = this.buildMatchPrompt(buyerProfile, listing, compatibilityScore);
      const recommendation = await this.callOpenAI(prompt);
      return this.parseRecommendation(recommendation);
    } catch (error) {
      this.logger.error('Failed to generate AI recommendation', error);
      return this.getFallbackReasons(buyerProfile, listing, compatibilityScore);
    }
  }

  /**
   * Generate market insights using AI
   */
  async generateMarketInsights(
    cropType: string,
    marketData: any,
  ): Promise<{
    summary: string;
    trends: string[];
    recommendations: string[];
    priceForecast: string;
  }> {
    if (!this.useAi) {
      return this.getFallbackInsights(cropType, marketData);
    }

    try {
      const prompt = this.buildMarketInsightsPrompt(cropType, marketData);
      const insights = await this.callOpenAI(prompt);
      return this.parseMarketInsights(insights);
    } catch (error) {
      this.logger.error('Failed to generate market insights', error);
      return this.getFallbackInsights(cropType, marketData);
    }
  }

  /**
   * Generate price prediction explanation
   */
  async generatePricePredictionExplanation(
    cropType: string,
    prediction: { min: number; max: number; avg: number },
    historicalData: any[],
  ): Promise<string> {
    if (!this.useAi) {
      return this.getFallbackPriceExplanation(cropType, prediction);
    }

    try {
      const prompt = this.buildPricePredictionPrompt(cropType, prediction, historicalData);
      const explanation = await this.callOpenAI(prompt);
      return explanation.trim();
    } catch (error) {
      this.logger.error('Failed to generate price prediction explanation', error);
      return this.getFallbackPriceExplanation(cropType, prediction);
    }
  }

  /**
   * Call OpenAI API
   */
  private async callOpenAI(prompt: string): Promise<string> {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // Using cost-effective model
        messages: [
          {
            role: 'system',
            content: 'You are an expert agricultural commodity trading advisor specializing in West African markets. Provide concise, actionable insights.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  /**
   * Build match recommendation prompt
   */
  private buildMatchPrompt(buyerProfile: any, listing: any, score: number): string {
    return `Analyze this buyer-listing match and provide 3-5 key reasons why this is a good match:

Buyer Profile:
- Company: ${buyerProfile.companyName || 'N/A'}
- Seeking: ${buyerProfile.seekingCrops?.join(', ') || 'N/A'}
- Quality Standards: ${buyerProfile.qualityStandards?.join(', ') || 'N/A'}
- Volume Required: ${buyerProfile.volumeRequired || 'Flexible'}
- Country: ${buyerProfile.countryName || buyerProfile.country || 'N/A'}

Listing Details:
- Crop: ${listing.cropType}
- Variety: ${listing.cropVariety || 'N/A'}
- Quality Grade: ${listing.qualityGrade}
- Quantity: ${listing.quantity} ${listing.unit}
- Price: ${listing.pricePerUnit} per ${listing.unit}
- Location: ${listing.farmer?.region || 'N/A'}, ${listing.farmer?.district || 'N/A'}
- Certifications: ${listing.certifications?.join(', ') || 'None'}
- Available: ${listing.availableFrom ? new Date(listing.availableFrom).toLocaleDateString() : 'N/A'}

Compatibility Score: ${score}/100

Provide concise, business-focused reasons (one per line, no numbering) explaining why this match is valuable.`;
  }

  /**
   * Build market insights prompt
   */
  private buildMarketInsightsPrompt(cropType: string, marketData: any): string {
    return `Analyze the ${cropType} market and provide insights:

Market Data:
- Active Listings: ${marketData.activeListings || 0}
- Average Price: ${marketData.avgPrice || 'N/A'}
- Price Trend: ${marketData.priceTrend || 'stable'}
- Total Volume: ${marketData.totalVolume || 0}
- Recent Transactions: ${marketData.recentTransactions || 0}

Provide:
1. A brief market summary (2-3 sentences)
2. 3-4 key trends (one per line)
3. 2-3 actionable recommendations (one per line)
4. Price forecast outlook (1-2 sentences)

Format as JSON with keys: summary, trends (array), recommendations (array), priceForecast`;
  }

  /**
   * Build price prediction prompt
   */
  private buildPricePredictionPrompt(
    cropType: string,
    prediction: { min: number; max: number; avg: number },
    historicalData: any[],
  ): string {
    return `Explain this price prediction for ${cropType}:

Predicted Price Range:
- Average: ${prediction.avg}
- Minimum: ${prediction.min}
- Maximum: ${prediction.max}

Historical Data Points: ${historicalData.length}

Provide a 2-3 sentence explanation of the price forecast, considering market trends and historical patterns.`;
  }

  /**
   * Parse AI recommendation into array of reasons
   */
  private parseRecommendation(text: string): string[] {
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.match(/^\d+[\.\)]/))
      .slice(0, 5);
  }

  /**
   * Parse market insights from AI response
   */
  private parseMarketInsights(text: string): {
    summary: string;
    trends: string[];
    recommendations: string[];
    priceForecast: string;
  } {
    try {
      // Try to parse as JSON first
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      this.logger.warn('Failed to parse JSON, using text parsing');
    }

    // Fallback: parse from structured text
    const lines = text.split('\n').map((l) => l.trim()).filter((l) => l);
    return {
      summary: lines[0] || 'Market analysis available',
      trends: lines.slice(1, 5).filter((l) => l.length > 10),
      recommendations: lines.slice(5, 8).filter((l) => l.length > 10),
      priceForecast: lines[lines.length - 1] || 'Price forecast pending',
    };
  }

  /**
   * Fallback reasons when AI is not available
   */
  private getFallbackReasons(buyerProfile: any, listing: any, score: number): string[] {
    const reasons: string[] = [];

    if (buyerProfile.seekingCrops?.includes(listing.cropType)) {
      reasons.push(`Crop type matches buyer requirements: ${listing.cropType}`);
    }

    if (listing.qualityGrade === 'PREMIUM') {
      reasons.push(`Premium quality grade meets high standards`);
    }

    if (listing.quantity >= 10) {
      reasons.push(`Large quantity available: ${listing.quantity} ${listing.unit}`);
    }

    if (listing.certifications && listing.certifications.length > 0) {
      reasons.push(`Certifications: ${listing.certifications.join(', ')}`);
    }

    if (score >= 70) {
      reasons.push('High compatibility score - excellent match');
    }

    return reasons.length > 0 ? reasons : ['Compatible listing based on basic criteria'];
  }

  /**
   * Fallback market insights
   */
  private getFallbackInsights(cropType: string, marketData: any): {
    summary: string;
    trends: string[];
    recommendations: string[];
    priceForecast: string;
  } {
    return {
      summary: `The ${cropType} market shows ${marketData.activeListings || 0} active listings with an average price of ${marketData.avgPrice || 'N/A'}.`,
      trends: [
        `Active listings: ${marketData.activeListings || 0}`,
        `Average price: ${marketData.avgPrice || 'N/A'}`,
        `Market activity: ${marketData.recentTransactions || 0} recent transactions`,
      ],
      recommendations: [
        'Monitor price trends regularly',
        'Consider seasonal variations',
        'Engage with multiple suppliers',
      ],
      priceForecast: 'Price forecast based on historical data and current market conditions.',
    };
  }

  /**
   * Fallback price explanation
   */
  private getFallbackPriceExplanation(
    cropType: string,
    prediction: { min: number; max: number; avg: number },
  ): string {
    return `Based on historical data, ${cropType} prices are predicted to average ${prediction.avg}, with a range between ${prediction.min} and ${prediction.max}. This forecast considers recent market trends and transaction patterns.`;
  }
}


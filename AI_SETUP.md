# AI Capabilities Setup Guide

## Overview

TradeLink+ now includes enhanced AI capabilities for:
- **Intelligent Matching**: LLM-powered buyer-listing recommendations
- **Market Insights**: AI-generated market analysis and trends
- **Price Predictions**: Enhanced forecasting with explanations
- **Market Intelligence**: Automated alerts and opportunities

## Setup Instructions

### 1. OpenAI API Key (Recommended)

To enable full AI capabilities, you need an OpenAI API key:

1. Sign up at [OpenAI Platform](https://platform.openai.com/)
2. Create an API key in your account settings
3. Add it to your `.env` file:

```env
OPENAI_API_KEY=sk-your-api-key-here
```

**Note**: The system will automatically fall back to rule-based logic if no API key is provided, so the platform will still function without it.

### 2. Cost Considerations

- **Model Used**: `gpt-4o-mini` (cost-effective)
- **Estimated Cost**: ~$0.01-0.05 per 1000 matches/insights
- **Token Limit**: 500 tokens per request (optimized for cost)

### 3. Environment Variables

Add to `api/.env`:

```env
# AI Configuration
OPENAI_API_KEY=sk-your-key-here  # Optional: enables AI features
```

### 4. Features

#### Without API Key (Fallback Mode)
- ✅ Rule-based matching (existing functionality)
- ✅ Basic market insights
- ✅ Simple price predictions
- ✅ All core features work

#### With API Key (Enhanced Mode)
- ✅ **Intelligent Matching**: Context-aware recommendations with natural language explanations
- ✅ **Market Insights**: AI-generated summaries, trends, and recommendations
- ✅ **Price Forecasts**: Detailed explanations of price predictions
- ✅ **Market Intelligence**: Automated opportunity detection and alerts

## API Endpoints

### Market Insights

```bash
# Get insights for a specific crop
GET /api/market-insights/crop?cropType=Cocoa

# Get overall market overview
GET /api/market-insights/overview

# Get insights for multiple crops
GET /api/market-insights/multi-crop?crops=Cocoa,Coffee,Shea Nuts
```

### Enhanced Matching

The matching service automatically uses AI when available:
- Existing endpoints work as before
- Match recommendations now include AI-generated explanations
- Fallback to rule-based logic if AI is unavailable

## Testing

1. **Test without API key** (fallback mode):
   ```bash
   # Should work with rule-based logic
   curl http://localhost:4000/api/market-insights/crop?cropType=Cocoa
   ```

2. **Test with API key** (AI mode):
   ```bash
   # Add OPENAI_API_KEY to .env
   # Restart server
   # Should return AI-generated insights
   curl http://localhost:4000/api/market-insights/crop?cropType=Cocoa
   ```

## Monitoring

Check logs for AI service status:
- `AI services enabled with OpenAI` - AI is active
- `No OpenAI API key found. Using rule-based fallback.` - Fallback mode

## Troubleshooting

### AI not working?
1. Check API key is set: `echo $OPENAI_API_KEY`
2. Verify key is valid (test at OpenAI platform)
3. Check API rate limits
4. Review server logs for errors

### High costs?
- System uses `gpt-4o-mini` (most cost-effective)
- Token limits are set to 500 per request
- Consider caching insights for frequently accessed crops

## Next Steps

1. ✅ Add `OPENAI_API_KEY` to `.env`
2. ✅ Restart the API server
3. ✅ Test market insights endpoint
4. ✅ Verify AI recommendations in match suggestions

## Support

For issues or questions:
- Check server logs for AI service errors
- Verify API key permissions
- Review OpenAI API status page


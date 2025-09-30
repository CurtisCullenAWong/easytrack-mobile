import { GoogleGenAI } from "@google/genai"
import Constants from "expo-constants"
const { GEMINI_API_KEY } = Constants.expoConfig.extra

// Initialize the Gemini API with your API key
const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null

export const analyzeDeliveryStats = async (stats) => {
  try {
    // Check if API key is available
    if (!GEMINI_API_KEY) {
      throw new Error('API_KEY_MISSING')
    }

    // Check if AI instance is initialized
    if (!ai) {
      throw new Error('AI_NOT_INITIALIZED')
    }

    const prompt = `
    Don't use ** or * for formatting.
    Analyze the following delivery statistics and provide insights:
    Total Deliveries: ${stats.totalDeliveries}
    Successful Deliveries: ${stats.successfulDeliveries}
    Failed Deliveries: ${stats.failedDeliveries}
    Success Rate: ${(stats.successRate * 100).toFixed(1)}%
    Total Revenue: ₱${stats.totalRevenue.toLocaleString()}
    Average Delivery Time: ${stats.averageDeliveryTime} minutes
    Deliveries by Region: ${JSON.stringify(stats.deliveriesByRegion)}
    For context, there are 3 actors in the system: delivery personnel (employees), administrator (supervisors), airlines (clients).
    The airlines are the ones that make the booking and EGC-GHE delivers the assigned luggage.
    Please provide:
    1. A brief summary of overall performance
    2. Key strengths and areas for improvement
    3. Specific recommendations for optimization
    4. Regional performance insights
    Keep the response concise, readable for end users, and actionable.`

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash-lite",
      contents: prompt,
    })

    return response.text
  } catch (error) {
    console.error('Error analyzing statistics with Gemini:', error)
    
    // Handle specific error cases
    if (error.message === 'API_KEY_MISSING') {
      throw new Error('API_KEY_MISSING')
    }
    
    if (error.message === 'AI_NOT_INITIALIZED') {
      throw new Error('AI_NOT_INITIALIZED')
    }
    
    // Check for API key expiration
    if (error.message?.includes('API key expired') || 
        error.message?.includes('API_KEY_INVALID') ||
        error.message?.includes('INVALID_ARGUMENT')) {
      throw new Error('API_KEY_EXPIRED')
    }
    
    // Check for rate limiting or service overload
    if (error.message?.includes('overloaded') || 
        error.message?.includes('quota') ||
        error.message?.includes('rate limit')) {
      throw new Error('SERVICE_OVERLOADED')
    }
    
    // Generic error
    throw new Error('GENERIC_ERROR')
  }
}

// Fallback insights generator when AI is not available
export const generateFallbackInsights = (stats) => {
  const successRate = (stats.successRate * 100).toFixed(1)
  const totalRevenue = stats.totalRevenue.toLocaleString()
  
  let performanceSummary = ''
  let recommendations = ''
  
  // Performance summary
  if (stats.totalDeliveries === 0) {
    performanceSummary = 'No delivery data available for analysis.'
  } else if (successRate >= 90) {
    performanceSummary = `Excellent performance! You've achieved a ${successRate}% success rate with ${stats.totalDeliveries} total deliveries.`
  } else if (successRate >= 75) {
    performanceSummary = `Good performance with a ${successRate}% success rate. There's room for improvement.`
  } else {
    performanceSummary = `Performance needs attention with a ${successRate}% success rate. Focus on improving delivery success.`
  }
  
  // Recommendations
  if (stats.failedDeliveries > 0) {
    recommendations = `• Review failed delivery cases to identify common issues\n• Consider additional training for challenging scenarios\n• Implement better communication protocols with clients`
  }
  
  if (stats.averageDeliveryTime > 120) { // More than 2 hours
    recommendations += `\n• Optimize delivery routes to reduce average delivery time\n• Consider batch deliveries for efficiency`
  }
  
  if (Object.keys(stats.deliveriesByRegion).length > 1) {
    recommendations += `\n• Analyze regional performance variations\n• Share best practices across different regions`
  }
  
  return `${performanceSummary}\n\nKey Insights:\n• Total Revenue: ₱${totalRevenue}\n• Average Delivery Time: ${stats.averageDeliveryTime} minutes\n• Successful Deliveries: ${stats.successfulDeliveries}\n\nRecommendations:\n${recommendations || '• Continue maintaining current performance standards\n• Monitor key metrics regularly'}`
}
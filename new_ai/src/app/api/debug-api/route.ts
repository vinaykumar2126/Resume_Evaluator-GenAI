import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function GET() {
  try {
    console.log('🔍 Debugging API key access...');
    
    // Check environment variable
    const apiKey = process.env.GEMINI_API_KEY;
    console.log('API Key found:', !!apiKey);
    console.log('API Key preview:', apiKey ? apiKey.substring(0, 10) + '...' : 'NOT FOUND');
    
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'No API key found',
        env: process.env.NODE_ENV
      });
    }
    
    // Test with same initialization as evaluate endpoint
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    console.log('⏳ Testing with simple prompt...');
    
    const result = await model.generateContent('Say "debug test successful"');
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ Debug test successful');
    
    return NextResponse.json({
      success: true,
      apiKeyPreview: apiKey.substring(0, 10) + '...',
      response: text,
      environment: process.env.NODE_ENV
    });
    
  } catch (error) {
    console.error('❌ Debug test failed:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: error instanceof Error ? error.constructor.name : 'Unknown',
      environment: process.env.NODE_ENV
    });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { geminiService, ChatMessage } from '@/lib/services/geminiService';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated (optional - you can remove this if you want public access)
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please sign in to use the chatbot.' },
        { status: 401 }
      );
    }

    const { message, conversationHistory } = await request.json();

    // Validate input
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Message is required and must be a non-empty string.' },
        { status: 400 }
      );
    }

    if (message.length > 1000) {
      return NextResponse.json(
        { success: false, error: 'Message is too long. Please keep it under 1000 characters.' },
        { status: 400 }
      );
    }

    // Validate conversation history format
    let validatedHistory: ChatMessage[] = [];
    if (conversationHistory && Array.isArray(conversationHistory)) {
      validatedHistory = conversationHistory
        .filter((msg: any) => 
          msg && 
          typeof msg === 'object' && 
          typeof msg.content === 'string' && 
          (msg.role === 'user' || msg.role === 'assistant')
        )
        .slice(-10); // Keep only last 10 messages for context
    }

    // Check if Gemini service is configured
    if (!geminiService.isConfigured()) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'AI service is not properly configured. Please contact your administrator.' 
        },
        { status: 503 }
      );
    }

    // Generate AI response
    const response = await geminiService.generateResponse(message, validatedHistory);

    if (!response.success) {
      return NextResponse.json(
        { success: false, error: response.error || 'Failed to generate response' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: response.message,
    });

  } catch (error) {
    console.error('Chat API error:', error);

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error. Please try again later.' },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  try {
    const isHealthy = await geminiService.healthCheck();
    
    return NextResponse.json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      configured: geminiService.isConfigured(),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'unhealthy', error: 'Health check failed' },
      { status: 503 }
    );
  }
}
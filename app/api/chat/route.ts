import { NextRequest, NextResponse } from 'next/server';
import { geminiService, ChatMessage } from '@/lib/services/geminiService';
import { getServerSessionFirebase } from '@/lib/firebase/auth-helper';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSessionFirebase();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please sign in to use the chatbot.' },
        { status: 401 }
      );
    }

    const { message, conversationHistory } = await request.json();

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

    let validatedHistory: ChatMessage[] = [];
    if (conversationHistory && Array.isArray(conversationHistory)) {
      validatedHistory = conversationHistory
        .filter((msg: any) => 
          msg && 
          typeof msg === 'object' && 
          typeof msg.content === 'string' && 
          (msg.role === 'user' || msg.role === 'assistant')
        )
        .slice(-10);
    }

    if (!geminiService.isConfigured()) {
      return NextResponse.json(
        { success: false, error: 'AI service is not properly configured. Please contact your administrator.' },
        { status: 503 }
      );
    }

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
import { NextResponse } from 'next/server';
import { runPipeline } from '@/lib/pipeline-service';

export const maxDuration = 300; // 5 minutes max (Vercel Pro)
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Process 5 MPAs per invocation
    const result = await runPipeline(5);

    return NextResponse.json({
      status: 'ok',
      ...result,
    });
  } catch (error) {
    console.error('Pipeline cron error:', error);
    return NextResponse.json(
      { error: 'Pipeline failed', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

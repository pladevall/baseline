/**
 * Hevy Connect API
 * POST - Validate API key and create connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { HevyClient } from '@/lib/hevy-client';
import { saveHevyConnection } from '@/lib/supabase-hevy';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { apiKey, connectionName } = body;

        if (!apiKey) {
            return NextResponse.json(
                { error: 'API key is required' },
                { status: 400 }
            );
        }

        // Validate the API key
        const client = new HevyClient(apiKey);
        const isValid = await client.validateApiKey();

        if (!isValid) {
            return NextResponse.json(
                { error: 'Invalid API key' },
                { status: 401 }
            );
        }

        // Save the connection
        const connection = await saveHevyConnection({
            apiKey,
            connectionName: connectionName || 'My Hevy',
        });

        return NextResponse.json({
            success: true,
            connection: {
                id: connection.id,
                connectionName: connection.connectionName,
                syncStatus: connection.syncStatus,
                createdAt: connection.createdAt,
            },
        });
    } catch (error) {
        console.error('Error connecting Hevy:', error);
        return NextResponse.json(
            { error: 'Failed to connect Hevy' },
            { status: 500 }
        );
    }
}

/**
 * Hevy Connections API
 * GET - List all Hevy connections
 * DELETE - Remove a Hevy connection
 */

import { NextRequest, NextResponse } from 'next/server';
import { getHevyConnections, deleteHevyConnection } from '@/lib/supabase-hevy';

export async function GET() {
    try {
        const connections = await getHevyConnections();

        // Return connections without sensitive API key
        const safeConnections = connections.map(c => ({
            id: c.id,
            connectionName: c.connectionName,
            lastSync: c.lastSync,
            syncStatus: c.syncStatus,
            createdAt: c.createdAt,
        }));

        return NextResponse.json({ connections: safeConnections });
    } catch (error) {
        console.error('Error fetching Hevy connections:', error);
        return NextResponse.json(
            { error: 'Failed to fetch connections' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const connectionId = searchParams.get('id');

        if (!connectionId) {
            return NextResponse.json(
                { error: 'Connection ID is required' },
                { status: 400 }
            );
        }

        await deleteHevyConnection(connectionId);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting Hevy connection:', error);
        return NextResponse.json(
            { error: 'Failed to delete connection' },
            { status: 500 }
        );
    }
}

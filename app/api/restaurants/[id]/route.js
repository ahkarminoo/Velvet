import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Restaurant from '@/models/Restaurants';

export async function GET(request, { params }) {
    try {
        await dbConnect();

        // Get restaurant by ID
        const { id } = await params;
        const restaurant = await Restaurant.findById(id);

        if (!restaurant) {
            return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
        }

        return NextResponse.json(restaurant);
    } catch (error) {
        console.error('Error fetching restaurant:', error);
        return NextResponse.json(
            { error: "Internal server error" }, 
            { status: 500 }
        );
    }
}

export async function PUT(request, { params }) {
    try {
        await dbConnect();
        const { id } = await params;
        const updateData = await request.json();
        
        const restaurant = await Restaurant.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true }
        );

        if (!restaurant) {
            return NextResponse.json(
                { error: 'Restaurant not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(restaurant);
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to update restaurant' },
            { status: 500 }
        );
    }
}
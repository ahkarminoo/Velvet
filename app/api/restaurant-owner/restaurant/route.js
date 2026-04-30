import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Restaurant from '@/models/Restaurants';
import jwt from 'jsonwebtoken';

export async function GET(req) {
  try {
    await dbConnect();
    
    const token = req.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const restaurant = await Restaurant.findOne({ ownerId: decoded.userId });

    if (!restaurant) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    return NextResponse.json({ restaurant });
  } catch (error) {
    console.error('Error in restaurant fetch:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 
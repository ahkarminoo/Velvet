import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/user";

export async function GET() {
  try {
    await dbConnect();
    
    // Get a test customer
    const customer = await User.findOne({ role: 'customer' });
    
    return NextResponse.json({
      success: true,
      message: "Debug info",
      data: {
        hasCustomer: !!customer,
        customerId: customer?._id,
        customerName: customer?.firstName,
        customerLineUserId: customer?.lineUserId
      }
    });
  } catch (error) {
    console.error("Debug endpoint error:", error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

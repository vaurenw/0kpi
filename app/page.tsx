import { SignedIn, SignedOut } from "@clerk/nextjs";
import { GoalFeed } from "@/components/goal-feed";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <SignedOut>
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-full max-w-md text-center space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Pledge Goals</h1>
              <p className="text-gray-600">Commit to your goals with financial accountability</p>
            </div>
            
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Set goals, make pledges, and stay accountable. If you don't complete your goal by the deadline, your pledge amount is charged.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/sign-in" className="flex-1">
                  <Button className="w-full">
                    Sign In
                  </Button>
                </Link>
                <Link href="/sign-up" className="flex-1">
                  <Button variant="outline" className="w-full">
                    Sign Up
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </SignedOut>
      
      <SignedIn>
        <GoalFeed />
      </SignedIn>
    </div>
  );
}

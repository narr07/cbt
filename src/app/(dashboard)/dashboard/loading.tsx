import { Card, CardContent } from '@/components/ui/card'

export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div>
        <div className="h-9 w-64 bg-muted rounded-lg mb-2" />
        <div className="h-5 w-96 bg-muted/50 rounded-md" />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <div className="h-4 w-24 bg-muted rounded" />
                <div className="h-8 w-16 bg-muted rounded" />
              </div>
              <div className="h-3 w-32 bg-muted/50 rounded mt-4" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="pt-6 space-y-6 h-[400px]">
            <div className="flex justify-between">
              <div className="h-6 w-32 bg-muted rounded" />
              <div className="h-6 w-24 bg-muted/50 rounded" />
            </div>
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-4 items-center">
                <div className="h-12 w-12 bg-muted rounded-xl" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-full bg-muted rounded" />
                  <div className="h-3 w-1/2 bg-muted/50 rounded" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <div className="h-[400px] bg-muted rounded-xl" />
      </div>
    </div>
  )
}

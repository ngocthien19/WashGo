import { PackageSearch, RefreshCw } from 'lucide-react'
import { Button } from '~/components/ui/button'

export default function CatalogFeedback({
  loading,
  error,
  retry,
  empty = 'Chưa có dịch vụ đang bán.',
  loadingText = 'Đang tải dịch vụ...'
}) {
  if (loading) {
    return (
      <div
        role="status"
        className="grid min-h-48 place-items-center text-sm text-muted-foreground"
      >
        <div className="flex items-center gap-2">
          <RefreshCw className="size-4 animate-spin motion-reduce:animate-none" />
          {loadingText}
        </div>
      </div>
    )
  }
  return (
    <div className="rounded-2xl border border-dashed border-border p-8 text-center">
      <PackageSearch className="mx-auto mb-4 size-9 text-muted-foreground" />
      <p
        role={error ? 'alert' : 'status'}
        className="break-words text-sm text-muted-foreground"
      >
        {error || empty}
      </p>
      {error && (
        <Button
          variant="outline"
          className="mt-4"
          onClick={retry}
        >
          <RefreshCw size={15} />
          Thử lại
        </Button>
      )}
    </div>
  )
}

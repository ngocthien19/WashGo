import { LocateFixed } from 'lucide-react'
import { Button } from '~/components/ui/button'

export default function LocationButton({ locating, onClick }) {
  return (
    <Button
      variant="outline-primary"
      className="h-11 rounded-full"
      disabled={locating}
      onClick={onClick}
    >
      <LocateFixed size={16} />
      {locating ? 'Đang lấy vị trí...' : 'Dùng vị trí của tôi'}
    </Button>
  )
}

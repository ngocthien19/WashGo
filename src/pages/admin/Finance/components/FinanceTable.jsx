import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '~/components/ui/table'
import TablePagination from '~/components/Pagination/TablePagination'
import { TAKE } from '../financeModel'
const headerBg = 'bg-[color-mix(in_srgb,var(--primary)_8%,var(--muted))] dark:bg-[color-mix(in_srgb,var(--primary)_12%,var(--muted))]'
export default function FinanceTable({ columns, rows, label, pagination, rowKey = row => row.id, minWidth = 'min-w-[1000px]', embedded = false }) {
  const { t } = useTranslation()
  const [localPage, setLocalPage] = useState(1)
  const page = pagination?.page || Math.min(localPage, Math.max(1, Math.ceil(rows.length / TAKE)))
  const visible = pagination ? rows : rows.slice((page - 1) * TAKE, page * TAKE)
  return (
    <div
      data-pagination-scope={pagination ? undefined : ''}
      className={embedded ? 'overflow-hidden' : 'overflow-hidden rounded-2xl border border-border bg-card shadow-sm'}
    >
      <p className="border-b border-border p-5">
        <strong className="mr-2 text-2xl">
          {pagination?.total ?? rows.length}
        </strong>
        {t(label)}
      </p>
      {rows.length ? (
        <>
          <Table
            aria-label={t(label)}
            className={`${minWidth} text-base`}
          >
            <TableHeader>
              <TableRow>
                {columns.map(column => (
                  <TableHead
                    key={column.key}
                    className={`${headerBg} ${column.className || ''} ${column.key === 'actions' ? 'sticky right-0 z-20 w-28 border-l border-border text-center' : ''}`}
                  >
                    {t(column.label)}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map(row => (
                <TableRow key={rowKey(row)}>
                  {columns.map(column => (
                    <TableCell
                      key={column.key}
                      className={`${column.className || ''} ${column.key === 'actions' ? 'sticky right-0 z-10 border-l border-border bg-card text-center' : ''}`}
                    >
                      {column.render(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            currentPage={page}
            totalPages={pagination?.totalPages ?? Math.ceil(rows.length / TAKE)}
            total={pagination?.total ?? rows.length}
            pageSize={TAKE}
            rowCount={visible.length}
            onPageChange={pagination?.onChange || setLocalPage}
          />
        </>
      ) : (
        <p className="p-8 text-center text-muted-foreground">
          {t('admin.finance.empty')}
        </p>
      )}
    </div>
  )
}

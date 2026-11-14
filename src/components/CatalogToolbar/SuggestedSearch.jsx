import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Combobox } from '@base-ui/react/combobox'
import { LoaderCircle, Search } from 'lucide-react'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import ResourceThumbnail from '~/components/ResourceThumbnail/ResourceThumbnail'
import TruncatedText from '~/components/TruncatedText'
import { SEARCH_SUGGESTIONS } from '~/utils/constants'

function SuggestionText({ text, query }) {
  const matches = text.normalize('NFC').toLocaleLowerCase().includes(query)
  return (
    <TruncatedText className={matches ? 'text-sm font-bold text-foreground' : 'text-sm font-normal text-muted-foreground'}>
      {text}
    </TruncatedText>
  )
}

export default function SuggestedSearch({ id, keyword, onSearch, label, placeholder, className, loadSuggestions, renderForm = true, onDraftChange, hideLabel = false, showSearchButton = true }) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState(keyword || '')
  const [open, setOpen] = useState(false)
  const [composing, setComposing] = useState(false)
  const [result, setResult] = useState({ query: '', items: [], status: 'idle' })
  const anchor = useRef(null)
  const query = draft.trim().normalize('NFC').toLocaleLowerCase()
  const Container = renderForm ? 'form' : 'div'
  const enabled = open && query.length >= SEARCH_SUGGESTIONS.MIN_QUERY_LENGTH && !composing
  const current = result.query === query ? result : { items: [], status: 'loading' }

  useEffect(() => {
    if (!enabled) {
      return
    }
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setResult({ query, items: [], status: 'loading' })
      try {
        const items = await loadSuggestions(query, controller.signal)
        if (!controller.signal.aborted) {
          setResult({ query, items, status: 'ready' })
        }
      } catch {
        if (!controller.signal.aborted) {
          setResult({ query, items: [], status: 'error' })
        }
      }
    }, SEARCH_SUGGESTIONS.DEBOUNCE_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, enabled, loadSuggestions])

  const submit = (value) => {
    setOpen(false)
    onSearch(value.trim())
  }

  return (
    <Combobox.Root
      items={current.items}
      filter={null}
      value={null}
      inputValue={draft}
      open={enabled}
      modal={false}
      onOpenChange={setOpen}
      onInputValueChange={(value, details) => {
        // Closing a single-select Combobox resets to its null selection. Search drafts
        // belong to the user; only native editing should change them here.
        if (details.reason !== 'input-change') {
          details.cancel()
          return
        }
        setDraft(value)
        onDraftChange?.(value)
        setOpen(value.trim().length >= SEARCH_SUGGESTIONS.MIN_QUERY_LENGTH)
      }}
      onValueChange={(item) => {
        if (item) {
          setDraft(item.label)
          submit(item.label)
        }
      }}
      itemToStringLabel={(item) => item.label}
    >
      <Container
        ref={anchor}
        role="search"
        aria-label={hideLabel ? undefined : label}
        className={className}
        onSubmit={(event) => {
          event.preventDefault()
          if (!composing) {
            submit(draft)
          }
        }}
      >
        {!hideLabel && (
          <label
            htmlFor={id}
            className="sr-only"
          >
            {label}
          </label>
        )}
        <Combobox.Input
          id={id}
          aria-label={hideLabel ? label : undefined}
          name="keyword"
          type="search"
          autoComplete="off"
          maxLength={200}
          placeholder={placeholder}
          render={<Input className="h-9 border-0 bg-transparent px-0 shadow-none enabled:hover:border-transparent focus-visible:ring-0" />}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={() => setComposing(false)}
        />
        {showSearchButton && (
          <Button
            type={renderForm ? 'submit' : 'button'}
            onClick={renderForm ? undefined : () => submit(draft)}
            size="icon"
            className="size-9 shrink-0 rounded-full"
            aria-label={label}
          >
            <Search size={18} />
          </Button>
        )}
      </Container>
      <Combobox.Portal>
        <Combobox.Positioner
          anchor={anchor}
          side="bottom"
          align="start"
          sideOffset={8}
          collisionPadding={12}
          className="z-50"
        >
          <Combobox.Popup className="max-h-[min(24rem,var(--available-height))] w-[var(--anchor-width)] min-w-[min(18rem,calc(100vw-24px))] max-w-[calc(100vw-24px)] overflow-y-auto rounded-2xl border border-border bg-card text-foreground shadow-xl outline-none">
            <p className="border-b border-primary/10 bg-primary/5 px-4 py-3 text-sm font-semibold">
              {t('searchSuggestions.title')}
            </p>
            {current.status === 'loading' ? (
              <p
                role="status"
                className="flex items-center gap-2 p-4 text-sm text-muted-foreground"
              >
                <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" />
                {t('searchSuggestions.loading')}
              </p>
            ) : current.status === 'error' ? (
              <p
                role="status"
                className="p-4 text-sm text-muted-foreground"
              >
                {t('searchSuggestions.error')}
              </p>
            ) : !current.items.length ? (
              <p
                role="status"
                className="p-4 text-sm text-muted-foreground"
              >
                {t('searchSuggestions.empty')}
              </p>
            ) : null}
            <Combobox.List>
              {(item) => (
                <Combobox.Item
                  key={item.id}
                  value={item}
                  className="flex cursor-pointer items-center gap-3 border-b border-border/60 px-4 py-3 outline-none last:border-0 data-highlighted:bg-primary/10"
                >
                  {item.images ? (
                    <ResourceThumbnail
                      urls={item.images}
                      name={item.label}
                      className="size-12"
                    />
                  ) : <Search className="size-5 shrink-0 text-primary" />}
                  <span className="min-w-0 flex-1 space-y-1">
                    {item.fields ? item.fields.map((text) => (
                      <SuggestionText
                        key={text}
                        text={text}
                        query={query}
                      />
                    )) : (
                      <>
                        <SuggestionText
                          text={item.label}
                          query={query}
                        />
                        {item.code && (
                          <SuggestionText
                            text={item.code}
                            query={query}
                          />
                        )}
                        {item.description && (
                          <SuggestionText
                            text={item.description}
                            query={query}
                          />
                        )}
                        {item.price && (
                          <SuggestionText
                            text={item.price}
                            query={query}
                          />
                        )}
                      </>
                    )}
                  </span>
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  )
}

import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import FormField from '~/components/ui/FormField'
import FormError from '~/components/ui/FormError'
import SubmitButton from '~/components/ui/SubmitButton'
import { getApiError } from '~/utils/http/apiError'

export default function AuthForm({ schema, fields = [], renderFields, onSubmit, submitLabel, children, defaultValues, disabled }) {
  const {
    register,
    control,
    handleSubmit,
    setError,
    clearErrors,
    formState: { errors, isSubmitting }
  } = useForm({ resolver: yupResolver(schema), defaultValues })

  const submit = async (values) => {
    clearErrors('root')
    try {
      await onSubmit(values)
    } catch (error) {
      setError('root', { message: getApiError(error) })
    }
  }

  return (
    <form
      className="[&_label]:text-base [&_button[type=submit]]:text-base"
      onSubmit={handleSubmit(submit)}
      noValidate
    >
      <fieldset
        disabled={isSubmitting}
        className="m-0 min-w-0 border-0 p-0"
      >
        {renderFields?.({ control, errors, isSubmitting })}
        {fields.map((field) => (
          <FormField
            key={field.name}
            {...field}
            className="text-base"
            register={register}
            error={errors[field.name]}
          />
        ))}
        {children}
      </fieldset>
      <FormError>
        {errors.root?.message}
      </FormError>
      <SubmitButton
        loading={isSubmitting}
        disabled={disabled}
      >
        {submitLabel}
      </SubmitButton>
    </form>
  )
}

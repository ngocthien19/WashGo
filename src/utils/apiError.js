export const getApiError = (error) => {
  if (error.response?.status === 429) {
    return 'common.tooManyRequestsPleaseWaitAMomentAndTry'
  }
  if (error.response?.status === 401) {
    return 'common.yourEmailOrPasswordIsIncorrectOrYourSession'
  }
  if (error.code === 'ECONNABORTED') {
    return 'common.theConnectionTimedOutPleaseTryAgain'
  }
  if (error.isAxiosError && !error.response) {
    return 'common.unableToConnectToTheServerPleaseCheckYour'
  }
  return error.response?.data?.message || error.message || 'common.somethingWentWrongPleaseTryAgain'
}

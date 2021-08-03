import { useAtom } from 'jotai'
import { useOnboard } from './useOnboard'

import { callTransaction } from 'lib/utils/callTransaction'
import { createTransaction } from 'lib/services/createTransaction'
import { transactionsAtom } from '@pooltogether/react-components'

export const useSendTransaction = function (t) {
  const [transactions, setTransactions] = useAtom(transactionsAtom)
  const { onboard, address: usersAddress, provider } = useOnboard()

  const sendTx = async (txDetails) => {
    const defaultTxDetails = {
      name: '',
      contractAbi: [],
      contractAddress: '',
      method: '',
      value: 0,
      params: [],
      callbacks: {}
    }
    const { name, contractAbi, contractAddress, method, value, params, callbacks } = Object.assign(
      defaultTxDetails,
      txDetails
    )

    await onboard.walletCheck()

    const txId = transactions.length + 1

    let newTx = {
      __typename: 'Transaction',
      id: txId,
      name,
      inWallet: true,
      method,
      hash: '',
      ...callbacks
    }

    let updatedTransactions = createTransaction(newTx, transactions, setTransactions)

    callTransaction(
      t,
      updatedTransactions,
      setTransactions,
      newTx,
      provider,
      usersAddress,
      contractAbi,
      contractAddress,
      method,
      params,
      value
    )

    return txId
  }

  return sendTx
}

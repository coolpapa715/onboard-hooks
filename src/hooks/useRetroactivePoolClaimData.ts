import { useQuery } from 'react-query'
import { batch, contract } from '@pooltogether/etherplex'
import { ethers } from 'ethers'
import { isValidAddress } from '@pooltogether/utilities'

import { GOVERNANCE_CONTRACT_ADDRESSES, QUERY_KEYS } from '../constants'
import { useGovernanceChainId } from './useGovernanceChainId'
import { useOnboard } from './useOnboard'
import { useReadProvider } from './useReadProvider'
import { MerkleDistributorAbi } from '../abis/MerkleDistributor'

export const useRetroactivePoolClaimData = (address) => {
  const { refetch, data, isFetching, isFetched, error } = useFetchRetroactivePoolClaimData(address)

  return {
    loading: !isFetched,
    refetch,
    data,
    isFetching,
    isFetched,
    error
  }
}

const useFetchRetroactivePoolClaimData = (address) => {
  const { address: usersAddress } = useOnboard()
  const chainId = useGovernanceChainId()
  const { readProvider, isReadProviderReady } = useReadProvider(chainId)

  if (!address) {
    address = usersAddress
  }

  return useQuery(
    [QUERY_KEYS.retroactivePoolClaimDataQuery, address, chainId],
    async () => {
      return getRetroactivePoolClaimData(readProvider, chainId, address)
    },
    {
      enabled: Boolean(address && isReadProviderReady) && isValidAddress(usersAddress),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      refetchOnMount: false
    }
  )
}

const getRetroactivePoolClaimData = async (provider, chainId, usersAddress) => {
  const checksummedAddress = ethers.utils.getAddress(usersAddress)
  let merkleDistributionData: any = {}

  try {
    merkleDistributionData = await getMerkleDistributionData(checksummedAddress, chainId)
  } catch (e) {
    return {
      isMissing: true,
      isClaimed: false,
      formattedAmount: 0
    }
  }

  const formattedAmount = Number(
    ethers.utils.formatUnits(ethers.BigNumber.from(merkleDistributionData.amount).toString(), 18)
  )
  const isClaimed = await getIsClaimed(provider, chainId, merkleDistributionData.index)

  return {
    ...merkleDistributionData,
    formattedAmount,
    isClaimed
  }
}

const getMerkleDistributionData = async (usersAddress, chainId) => {
  const response = await fetch(
    `https://merkle.pooltogether.com/.netlify/functions/merkleAddressData?address=${usersAddress}${
      chainId === 4 ? '&chainId=4&testVersion=v4' : ''
    }`
  )


  if (response.status === 200) {
    return await response.json()
  } else {
    throw new Error('User does not exist in Merkle tree or 500 error')
  }
}

const getIsClaimed = async (provider, chainId, index) => {
  const merkleDistributorContract = contract(
    'merkleDistributor',
    MerkleDistributorAbi,
    GOVERNANCE_CONTRACT_ADDRESSES[chainId].MerkleDistributor
  )
  const { merkleDistributor } = await batch(provider, merkleDistributorContract.isClaimed(index))

  return merkleDistributor.isClaimed[0]
}

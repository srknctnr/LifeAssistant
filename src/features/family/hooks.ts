import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/features/auth/useAuth'
import {
  acceptInvite,
  cancelInvite,
  createFamily,
  createInvite,
  deleteFamily,
  getMyProfile,
  listInvites,
  listMemberships,
  listShares,
  removeMember,
  setShare,
  upsertProfile,
  type FamilyModule,
} from '@/features/family/api'
import { myShareMode, type ShareMode } from '@/features/family/share-utils'

const profileKey = ['profile'] as const
const membershipsKey = ['family_members'] as const
const invitesKey = ['family_invites'] as const
const sharesKey = ['module_shares'] as const

export function useMyProfile() {
  const { session } = useAuth()
  return useQuery({
    queryKey: profileKey,
    queryFn: () => getMyProfile(session!.user.id),
    enabled: Boolean(session),
  })
}

export function useUpsertProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: upsertProfile,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: profileKey }),
  })
}

export function useMemberships() {
  return useQuery({ queryKey: membershipsKey, queryFn: listMemberships })
}

export function useCreateFamily() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createFamily,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: membershipsKey }),
  })
}

export function useDeleteFamily() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteFamily,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membershipsKey })
      queryClient.invalidateQueries({ queryKey: sharesKey })
    },
  })
}

export function useRemoveMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: removeMember,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: membershipsKey }),
  })
}

export function useInvites() {
  return useQuery({ queryKey: invitesKey, queryFn: listInvites })
}

export function useCreateInvite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createInvite,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: invitesKey }),
  })
}

export function useCancelInvite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: cancelInvite,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: invitesKey }),
  })
}

export function useAcceptInvite() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: acceptInvite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: membershipsKey })
      queryClient.invalidateQueries({ queryKey: invitesKey })
    },
  })
}

export function useShares() {
  return useQuery({ queryKey: sharesKey, queryFn: listShares })
}

// Forms use this to decide how a new record's family visibility is set
export function useMyShareMode(module: FamilyModule): ShareMode {
  const { session } = useAuth()
  const shares = useShares()
  return myShareMode(shares.data ?? [], session?.user.id, module)
}

export function useSetShare() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: setShare,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sharesKey }),
  })
}

import { useProviderResource } from '@navet/app/hooks';
import { useEffect, useState } from 'react';
import type { FamilyMember } from '../../adapters/family-adapter';

export function HouseholdMemberAvatar({
  member,
  size,
}: {
  member: FamilyMember;
  size: 'small' | 'detail';
}) {
  const rawAvatar = member.avatar?.trim() || undefined;
  const requestKey = [member.personEntityId, member.providerId, rawAvatar]
    .filter(Boolean)
    .join('::');
  const resource = useProviderResource({
    deviceId: member.personEntityId,
    kind: 'primary_image',
    attrs: rawAvatar ? { entity_picture: rawAvatar } : undefined,
    fallbackPicture: rawAvatar,
    providerId: member.providerId,
    requestKey,
  });
  const [imageFailed, setImageFailed] = useState(false);
  const resolvedUrl =
    !imageFailed && resource?.kind === 'image' && resource.url ? resource.url : undefined;

  useEffect(() => {
    setImageFailed(false);
  }, [rawAvatar, resource?.url]);

  const initial = member.name.trim().slice(0, 1) || '?';

  return (
    <span className="household-presence-member-avatar" data-avatar-size={size}>
      {resolvedUrl ? (
        <img
          src={resolvedUrl}
          alt=""
          onError={() => setImageFailed(true)}
          referrerPolicy="no-referrer"
        />
      ) : (
        initial
      )}
    </span>
  );
}

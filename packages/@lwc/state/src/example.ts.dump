import { defineState } from './index.ts';


// *****************************
// *** USER CODE STARTS HERE ***
// *****************************

// Once everything is implemented, this...
  type UserType = {
    groupId?: string;
  }
  type GroupType = {
    something: string;
  }
  function dataGroup(groupId: Signal<string>): Signal<GroupType>
  function dataUser(userId: Signal<string>): Signal<UserType>
// ... would be replaced with this:
//   import { dataGroup, dataUser, GroupType, UserType } from 'the-data-layer';

// Once everything is implemented, this...
  import { otherStateDef } from 'somewhere';
  type OtherStateShape = {
    contextualDatum?: string;
  }
  type OtherStateDef = () => Signal<OtherStateShape>;
// ... would be replaced with this:
//   import { otherStateDef, OtherStateShape } from 'somewhere';

const stateDef = defineState((atom, computed, update, fromContext) => (uid: string) => {
  const otherState = fromContext<OtherStateShape, OtherStateDef>(otherStateDef);

  // You can define state atoms. They're essentially values wrapped in a signal, where
  // the only way to update its value is through the `update` utility.
  const userId = atom(uid);
  // We can pull in signals from elsewhere for composition in our state manager.
  const userInfo = dataUser(userId);
  // We can compute new values (wrapped in a signal)...
  const groupId = computed(
    // ... by declaring which signals are part of the computation...
    { userInfo, otherState },
    // ... and computing something from those signals' values.
    ({ userInfo, otherState }) => (userInfo?.groupId ?? '') + (otherState?.contextualDatum ?? ''),
  );
  // Since `groupId` is a computed value, it is also a signal; it can therefore be passed
  // to `dataGroup` which expects a `Signal<string>` as its only argument.
  const groupInfo = dataGroup(groupId);
  
  // This is the mechanism by which state atoms are able to be updated.
  const updateUserId = update(
    // Like `computed`, we must declare what atoms we're operating on.
    { userId },
    // And then we can assign them new values. For primitive values like the string here,
    // we can set the value by returning an object with the key/val pair.
    (_, newUserId: string, unused: number) => ({ userId: newUserId }),
    // For nested data structures, the above function would be invoked in such a way that
    // we could detect deep mutations in the data, and make updates accordingly.
  );

  // Here, we decide what to expose externally as part of the state manager.
  return {
    // We can include state atoms, ...
    userId,
    // ... signals we've composed from elsewhere, ...
    userInfo,
    // ... computed values, ...
    groupId,
    // ... signals that depend on computed values, ...
    groupInfo,
    // ... and mechanisms to update state atoms.
    updateUserId,
  };

  // Notably, we could _exclude_ any of the above and leave them as internal implementation
  // details, if desired. For example, we could choose not to return `userId`. If we did so,
  // it would not be externally accessible as `stateMgr.value.userId`, but it would still be
  // available for internal use.
});

// Example external usage:
const stateMgr = stateDef('foo');
const groupId: string = stateMgr.value.groupId;
stateMgr.value.updateUserId('new_user_id', 5);

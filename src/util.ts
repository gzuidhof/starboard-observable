export function hasParentWithId(el: HTMLElement | Element | null, id: string) {
  if (el === null) return false;

  let isChild = false;

  if (el.id === id) {
    //is this the element itself?
    isChild = true;
  }

  // eslint-disable-next-line no-cond-assign
  while ((el = el.parentNode as HTMLElement)) {
    if (el.id == id) {
      isChild = true;
    }
  }

  return isChild;
}

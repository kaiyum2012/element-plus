import { computed, shallowRef, onMounted, onUnmounted, onUpdated } from 'vue'
import { throttleAndDebounce } from '../utils'

import type { Ref } from 'vue'

const BOUNDING_OFFSET = 100 // 56 the header height + margin-top 32

export function useActiveSidebarLinks(
  container: Ref<HTMLElement>,
  marker: Ref<HTMLElement>
) {
  const onScroll = throttleAndDebounce(setActiveLink, 150)
  function setActiveLink() {
    const sidebarLinks = getSidebarLinks()
    const anchors = getAnchors(sidebarLinks)

    if (
      anchors.length &&
      window.scrollY + window.innerHeight === document.body.offsetHeight
    ) {
      activateLink(anchors[anchors.length - 1].hash)
      return
    }
    for (let i = 0; i < anchors.length; i++) {
      const anchor = anchors[i]
      const nextAnchor = anchors[i + 1]
      const [isActive, hash] = isAnchorActive(i, anchor, nextAnchor)
      if (isActive) {
        history.replaceState(
          null,
          document.title,
          hash ? (hash as string) : ' '
        )
        activateLink(hash as string)
        return
      }
    }
  }

  let prevActiveLink: HTMLAnchorElement | null = null

  function activateLink(hash: string) {
    deactiveLink(prevActiveLink)

    const activeLink = (prevActiveLink =
      hash == null
        ? null
        : (container.value.querySelector(
            `.toc-item a[href="${decodeURIComponent(hash)}"]`
          ) as HTMLAnchorElement))
    if (activeLink) {
      activeLink.classList.add('active')
      marker.value.style.opacity = '1'
      marker.value.style.top = activeLink.offsetTop + 'px'
    } else {
      marker.value.style.opacity = '0'
      marker.value.style.top = '33px'
    }
  }

  function deactiveLink(link: HTMLElement) {
    link && link.classList.remove('active')
  }

  onMounted(() => {
    window.requestAnimationFrame(setActiveLink)
    window.addEventListener('scroll', onScroll)
  })

  onUpdated(() => {
    activateLink(location.hash)
  })

  onUnmounted(() => {
    window.removeEventListener('scroll', onScroll)
  })
}
function getSidebarLinks() {
  return Array.from(
    document.querySelectorAll('.toc-content .toc-link')
  ) as HTMLAnchorElement[]
}
function getAnchors(sidebarLinks: HTMLAnchorElement[]) {
  return (
    Array.from(
      document.querySelectorAll('.doc-content .header-anchor')
    ) as HTMLAnchorElement[]
  ).filter((anchor) =>
    sidebarLinks.some((sidebarLink) => sidebarLink.hash === anchor.hash)
  )
}
function getPageOffset() {
  return (document.querySelector('.navbar') as HTMLElement).offsetHeight
}
function getAnchorTop(anchor: HTMLAnchorElement) {
  const pageOffset = getPageOffset()
  try {
    return anchor.parentElement.offsetTop - pageOffset - 15
  } catch (e) {
    return 0
  }
}
function isAnchorActive(
  index: number,
  anchor: HTMLAnchorElement,
  nextAnchor: HTMLAnchorElement
) {
  const scrollTop = window.scrollY
  if (index === 0 && scrollTop === 0) {
    return [true, null]
  }
  if (scrollTop < getAnchorTop(anchor)) {
    return [false, null]
  }
  if (!nextAnchor || scrollTop < getAnchorTop(nextAnchor)) {
    return [true, decodeURIComponent(anchor.hash)]
  }
  return [false, null]
}

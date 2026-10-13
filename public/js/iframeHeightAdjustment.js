//! WARNING: This file is **also** included as is into 3rd party iframes (that are then embedded in our pages),
//! and thus is not being transpiled, so we should not use features not present in ECMAScript 2015.

;(function () {
  let resizeObserver

  let currentObservedWidth
  let currentObservedHeight

  const isFacebookIFrame = () =>
    ['facebook', 'facebook.html'].some((pathEnding) =>
      window.location.pathname.endsWith(pathEnding),
    )

  const getCorrectUniqueIframeId = () => {
    // Then check if the unique id is an id set on the iframe element
    if (window.frameElement && window.frameElement.id) {
      return window.frameElement.id
    }

    // As a fallback return the url as a unique identifier
    return window.location.href
  }

  const getIsWindowiOS = (theWindow) =>
    !!theWindow &&
    !!theWindow.webkit &&
    !!theWindow.webkit.messageHandlers &&
    !!theWindow.webkit.messageHandlers.onMessageListener &&
    !!theWindow.webkit.messageHandlers.onMessageListener.postMessage

  const getIsParentiOS = () => getIsWindowiOS(window)

  const sendEventToiOS = (event) => {
    if (!event.blick_event_type) {
      event.blick_event_type = event.type
    } else if (!event.type) {
      event.type = event.blick_event_type
    }

    try {
      window.webkit.messageHandlers.onMessageListener.postMessage(
        JSON.stringify(event),
      )
    } catch {
      // Nothing to worry about; if it fails we're not on the iOS platform
    }
  }

  const getIsWindowAndroid = (theWindow) =>
    !!theWindow && !!theWindow.BlickAndroidJsBridge

  const getIsParentAndroid = () => getIsWindowAndroid(window)

  const sendEventToAndroid = (event) => {
    if (!event.blick_event_type) {
      event.blick_event_type = event.type
    } else if (!event.type) {
      event.type = event.blick_event_type
    }

    try {
      BlickAndroidJsBridge.emitEvent(JSON.stringify(event))
    } catch {
      // Nothing to worry about; if it fails we're not on the Android platform
    }
  }

  const getIsParentWeb = () => !getIsParentiOS() && !getIsParentAndroid()

  const isAppWebView = (targetWindow) => {
    if (!targetWindow) {
      return false
    }

    if (getIsWindowiOS(targetWindow)) {
      return true
    }

    if (getIsWindowAndroid(targetWindow)) {
      return true
    }

    return false
  }

  const sendEventToWeb = (event) => {
    event.iframeId = getCorrectUniqueIframeId()

    if (!event.blick_event_type) {
      event.blick_event_type = event.type
    } else if (!event.type) {
      event.type = event.blick_event_type
    }

    try {
      window.parent.postMessage(event, '*')
    } catch {
      // Nothing to worry about; if it fails we're not on the Web platform
    }
  }

  const sendTrackingToParent = (trackingInfo) => {
    if (!!trackingInfo && !!trackingInfo.event) {
      const event = {
        blick_event_type: 'TRACK',
        name: trackingInfo.event,
        data: Object.keys(trackingInfo).reduce((acc, key) => {
          if (key !== 'event') {
            acc[key] = trackingInfo[key]
          }
          return acc
        }, {}),
      }

      sendEventToParent(event)
    }
  }

  const sendDimensionsToParent = (width, height) => {
    const data = {
      blick_event_type: 'resize',
      height,
      width,
    }

    //! Android doesn't have a listener for dimensions, as it can natively
    //! adjust to dimention changes based on its own webview implementation.

    sendEventToiOS({
      blick_event_type: 'HEIGHT_CHANGED',
      height: data.height,
      iFrameId: getCorrectUniqueIframeId(),
    })

    sendEventToWeb(data)
  }

  const sendEventToNativeParent = (event) => {
    if (!event.type && !event.blick_event_type) {
      return
    }

    sendEventToAndroid(event)

    sendEventToiOS(event)
  }

  const sendEventToParent = (event) => {
    if (!event.type && !event.blick_event_type) {
      return
    }

    const currentWindow = window.self
    const parentWindow = window.parent

    if (currentWindow === parentWindow && isAppWebView(currentWindow)) {
      sendEventToNativeParent(event)
    } else {
      sendEventToWeb(event)
    }
  }

  const onResize = (entries) => {
    entries.forEach((entry) => {
      //! We avoid sending invalid width / height (it happens sometimes),
      //! like 0 height or width, or re-sending the same height & width
      //! as we have already done.
      const entryWidth = entry.contentRect.width
      const entryHeight = entry.contentRect.height

      if (
        typeof entryWidth === 'number' &&
        typeof entryHeight === 'number' &&
        entryWidth > 0 &&
        entryHeight > 0 &&
        //! Guard because facebook iframes sometimes send extremely small / great heights (e.g. 19 / 6600)
        //! and this would cause an extra layout shift when we set initial height in the iframes.
        (!isFacebookIFrame() || (entryHeight > 100 && entryHeight < 1000))
      ) {
        const intWidth = Math.ceil(entryWidth)
        const intHeight = Math.ceil(entryHeight)

        if (
          currentObservedWidth !== intWidth ||
          currentObservedHeight !== intHeight
        ) {
          currentObservedWidth = intWidth
          currentObservedHeight = intHeight

          sendDimensionsToParent(intWidth, intHeight)
        }
      }
    })
  }

  const addResizeObserver = () => {
    if (!resizeObserver) {
      try {
        resizeObserver = new ResizeObserver(onResize)
        heightAdjustmentId = Math.floor(Math.random() * 1000) + 1
        resizeObserver.observe(document.body)
      } catch {
        //! This error happens if ResizeObserver is not supported in this browser.
      }
    }
  }

  if (document.readyState === 'complete') {
    addResizeObserver()
  } else {
    window.addEventListener('load', () => {
      addResizeObserver()
    })
  }

  //* Create a dataLayer that can accept pushed events
  //* and will forward them to the respective apps
  if (Array.isArray(window.blickDataLayer)) {
    window.blickDataLayer.forEach((item) => {
      sendTrackingToParent(item)
    })
  }

  window.blickDataLayer = {
    push: (item) => {
      sendTrackingToParent(item)
    },
  }

  /* Get and set the inital theme of the page */
  const root = document.documentElement
  const params = new URLSearchParams(window.location.hash.substring(1))
  const retrievedTheme = params.get('theme') || 'light'

  if (retrievedTheme === 'dark') {
    root.style.setProperty('--is-light-theme', ' ')
    root.style.setProperty('--is-dark-theme', 'initial')
  } else {
    root.style.setProperty('--is-light-theme', 'initial')
    root.style.setProperty('--is-dark-theme', ' ')
  }

  /* Add a listener to detect theme changes in the parent frames */
  window.addEventListener('message', (event) => {
    if (event.source === window.parent) {
      if (event.data.blick_event_type === 'CHANGE_THEME') {
        const newTheme = event.data.theme

        if (
          root.style.getPropertyValue('--is-light-theme') === 'initial' &&
          newTheme === 'light'
        ) {
          return
        }

        if (
          root.style.getPropertyValue('--is-dark-theme') === 'initial' &&
          newTheme === 'dark'
        ) {
          return
        }

        if (newTheme === 'dark') {
          root.style.setProperty('--is-light-theme', ' ')
          root.style.setProperty('--is-dark-theme', 'initial')
          window.blickIframeUtils.currentTheme = 'dark'
        } else {
          root.style.setProperty('--is-light-theme', 'initial')
          root.style.setProperty('--is-dark-theme', ' ')
          window.blickIframeUtils.currentTheme = 'light'
        }
      }
    }
  })

  window.blickIframeUtils = {
    sendDimensionsToParent,
    sendEventToParent,
    sendEventToNativeParent,
    getIsParentiOS,
    getIsParentAndroid,
    getIsParentWeb,
  }

  window.blickIframeUtils._themeChangeCallbacks = {}

  window.blickIframeUtils._currentTheme = retrievedTheme

  window.blickIframeUtils.registerThemeChangeCallback = (id, callback) => {
    window.blickIframeUtils._themeChangeCallbacks[id] = callback
  }

  window.blickIframeUtils.deregisterThemeChangeCallback = (id) => {
    delete window.blickIframeUtils._themeChangeCallbacks[id]
  }

  Object.defineProperty(window.blickIframeUtils, 'currentTheme', {
    configurable: true,
    enumerable: true,
    set: function (value) {
      this._currentTheme = value
      Object.values(window.blickIframeUtils._themeChangeCallbacks).forEach(
        (callback) => {
          if (typeof callback === 'function') {
            callback(value)
          }
        },
      )
    },
    get: function () {
      return this._currentTheme
    },
  })
})()

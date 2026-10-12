---
layout: home

hero:
  name: Halone
  text: Build apps for XR glasses
  tagline: Halone is an XR environment that runs on an Android phone and shows windows floating around you in the glasses. Write apps for it as web pages or as native Android plugins.
  image:
    src: /logo.png
    alt: Halone
  actions:
    - theme: brand
      text: Build a web app
      link: /web/getting-started
    - theme: alt
      text: Build a native plugin
      link: /native/getting-started
    - theme: alt
      text: Support new glasses
      link: /hardware/

features:
  - title: Web apps
    details: A Vite project with a halone.json manifest. @halone/sdk talks to the shell, and the halone CLI runs it in the simulator or on the glasses with hot reload, then packs it as a .halone file.
    link: /web/getting-started
    linkText: Getting started
  - title: Native plugins
    details: An ordinary Android APK built on dev.halone:plugin-sdk. Each app draws straight into a Surface the shell owns, with a Canvas, GL, a MediaCodec or plain Android views.
    link: /native/getting-started
    linkText: Getting started
  - title: Hardware
    details: Drivers sit behind a vendor-neutral layer. Supporting new glasses is one class and one line, and most of it can be tested against recorded packets before you plug anything in.
    link: /hardware/
    linkText: Adding a device
---

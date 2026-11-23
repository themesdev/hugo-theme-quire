---
title: "{{ replace .File.ContentBaseName "-" " " | strings.FirstUpper }}"
date: {{ .Date }}
draft: true
description: ""
tags: []
# cover:
#   src: cover.jpg        # a file next to index.md (hugo new posts/my-post/index.md), or under assets/images/
#   alt: ""               # what the photo shows
# featured: true          # the large card on the home page
# toc: false              # hide "In this post" (or true to show it with fewer headings)
---

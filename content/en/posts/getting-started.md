---
title: "Getting Started with Hugo"
date: 2023-11-20T12:00:00+08:00
draft: false
categories: ["Notes"]
tags: ["Hugo", "GitHub Pages", "Web Development"]
---

# Getting Started with Hugo

Hugo is a fast and modern static site generator written in Go, and designed to make website creation fun again.

## Installation

Installing Hugo is straightforward:

```bash
# For macOS
brew install hugo

# For Windows
choco install hugo -confirm

# For Linux
snap install hugo
```

## Creating a New Site

To create a new Hugo site, use the following command:

```bash
hugo new site mysite
```

## Adding Content

Create new content easily:

```bash
hugo new posts/my-first-post.md
```

## Running the Site Locally

To see your site in action:

```bash
hugo server -D
```

This will start a local server at `http://localhost:1313/`.

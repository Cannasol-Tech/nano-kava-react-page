/**
 * @file: src/seo/JsonLd.jsx
 * @author: Stephen Boyett
 *
 * @description:
 *     Renders a JSON-LD graph into <head> via react-helmet-async so the prerenderer
 *     captures it in the static HTML each crawler receives.
 *
 * @See Also:
 *     src/seo/structuredData.js
 *
 * ---
 * @Copyright © 2026 Cannasol Technologies. All Rights Reserved.
 * ---
 */

import React from 'react';
import { Helmet } from 'react-helmet-async';

export default function JsonLd({ data }) {
  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(data)}</script>
    </Helmet>
  );
}

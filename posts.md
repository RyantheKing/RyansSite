---
layout: default
title: Posts/Projects
permalink: /posts/
---
<hr style="height:0px; visibility:hidden;" />
<h1 style="margin: 0 0 5px;">My Blog</h1>
<p style="margin-top: 0px;">An index of posts containing guides, code walkthroughs for my projects, and other miscellaneous ramblings.</p>
<hr style="height:0px; visibility:hidden;" />
{% for post in site.posts %}
  <article>
    <h2 style="margin: 0 0 0px;"><a class="post-link" href="{{ post.url }}">{{ post.title }}</a></h2>
    <p>{{ post.description }}</p>
    <i class="mdi mdi-calendar"></i><i> {{ post.date | date: "%-d %B %Y" }}&nbsp;&nbsp;</i>
    <i class="mdi mdi-clock-time-three-outline"></i><i> {{ post.time }} minute read</i>
    <br>
    <i class="mdi mdi-tag-multiple-outline"></i>
    <i>
    {% if post.tags %}
      {{ post.tags | join: ", " }}
    {% endif %}
    </i>
    <br><br>
  </article>  
{% endfor %}
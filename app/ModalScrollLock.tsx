"use client";

import { useEffect } from "react";

export default function ModalScrollLock() {
  useEffect(() => {
    let locked = false;
    let scrollY = 0;

    const lock = () => {
      if (locked) return;
      locked = true;
      scrollY = window.scrollY;
      document.documentElement.classList.add("book-modal-open");
      document.body.classList.add("book-modal-open");
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = "0";
      document.body.style.right = "0";
      document.body.style.width = "100%";
    };

    const unlock = () => {
      if (!locked) return;
      locked = false;
      document.documentElement.classList.remove("book-modal-open");
      document.body.classList.remove("book-modal-open");
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollY);
    };

    const sync = () => {
      const modal = document.querySelector<HTMLElement>(".modal-backdrop .modal");
      if (modal) lock();
      else unlock();
    };

    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    sync();

    return () => {
      observer.disconnect();
      unlock();
    };
  }, []);

  return null;
}

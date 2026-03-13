"use client";
import { useEffect } from "react";

export default function ScaleInit() {
  useEffect(() => {
    function applyScale() {
      var w = window.innerWidth;
      var h = window.innerHeight;
      var baseWidth;
      if (w < 930) {
        baseWidth = h > w ? 430 : 650;
      } else {
        baseWidth = 1485;
      }
      var scale = w / baseWidth;
      document.documentElement.style.zoom = scale;
      var realVh = (h / scale) * 0.01;
      document.documentElement.style.setProperty('--real-vh', realVh + 'px');
    }
    applyScale();
    window.addEventListener('resize', applyScale);
    return () => window.removeEventListener('resize', applyScale);
  }, []);

  return null;
}
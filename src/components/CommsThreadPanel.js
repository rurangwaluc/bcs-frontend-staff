"use client";

import MessagesThread from "./MessagesThread";

export default function CommsThreadPanel(props) {
  return (
    <MessagesThread
      title="Internal communication"
      subtitle="Threaded messages are audited and location-scoped."
      allowThreadPicker
      {...props}
    />
  );
}

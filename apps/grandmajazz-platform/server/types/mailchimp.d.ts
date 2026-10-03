declare module "@mailchimp/mailchimp_marketing" {
  interface Config {
    apiKey: string;
    server: string;
  }

  interface ListMemberBody {
    email_address: string;
    status: "subscribed" | "pending" | "unsubscribed" | "cleaned";
    merge_fields?: Record<string, string>;
    tags?: string[];
  }

  interface TagUpdate {
    name: string;
    status: "active" | "inactive";
  }

  interface TagsBody {
    tags: TagUpdate[];
  }

  const lists: {
    addListMember(listId: string, body: ListMemberBody): Promise<any>;
    updateListMemberTags(listId: string, subscriberHash: string, body: TagsBody): Promise<any>;
  };

  const ping: {
    get(): Promise<{ health_status: string }>;
  };

  function setConfig(config: Config): void;

  export default {
    setConfig,
    lists,
    ping,
  };
}

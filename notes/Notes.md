## Notable properties from source data.

### data.DataCache.Players.IDs.Steam [list of objects]
	
	"StringID"                  = Steam ID, cross-reference this with .Players[n].IDs.Steam.ID 

	."StringID".Nickname        = Steam Name

### data.Sessions [array]

	.Name                       = Game title in Multiplayer listing
	.Address.NAT				= Possible unique Game ID?
	.Address.NAT_TYPE           = FULL_CONE | SYMMETRIC
	.Level.GameMode.ID          = MPI|STRAT
	.Level.Name                 = Map Name
	.PlayerCount.Player         = # of players
	.PlayerTypes[0].Max         = max # of players
	.Status.HasPassword         = true|false
	.Status.isLocked            = true|false
	.Status.State               = PreGame|InGame
	.Time.Context               = PreGame|InGame
	.Time.Seconds               = # of seconds
	.Players[N].Name            = In-Game Player Name
	.Players[N].IDs.Steam.ID    = cross-reference with StringID from DataCache to get SteamName
	.Players[N].Team.ID         = Team # (1|2)
	.Players[N].Team.Leader     = true|false (only exists if player is Commander)

### Steam

	."SteamID".AvatarUrl = <link to avatar img>
	."SteamID".Nickame = "Sev"
	."SteamID".ProfileUrl <link to steam profile>

### Game

### Player
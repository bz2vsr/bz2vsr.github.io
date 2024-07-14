## Notable properties from source data.

### data.DataCache.Players.IDs.Steam[n]
	
	"StringID"                  = Steam ID, cross-reference this with .Players[n].IDs.Steam.ID 

	."StringID".Nickname        = Steam Name

### data.Session[n]

	.Name                       = Game title in Multiplayer listing
	
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
	.Players[N].Team.ID         = Team # (1|2)
	.Players[N].Team.Leader     = true|false (only exists if leader)
	.Players[N].IDs.Steam.ID    = cross-reference with StringID from DataCache